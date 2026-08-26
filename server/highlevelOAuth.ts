import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  highLevelConnections,
  highLevelOAuthStates,
  type HighLevelConnection,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  decryptHighLevelToken,
  encryptHighLevelToken,
  hashOAuthState,
} from "./highlevelCrypto";
import { highLevelHeaders } from "./highlevel";

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const ACCESS_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  userType: "Location" | "Company";
  locationId?: string;
  companyId?: string;
  userId?: string;
};

export function isHighLevelOAuthStateUsable(
  state: { userId: number; expiresAt: number; usedAt: number | null },
  currentUserId: number,
  now: number,
) {
  return state.userId === currentUserId && state.usedAt === null && state.expiresAt >= now;
}

export function buildHighLevelRefreshBody(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  userType: "Location" | "Company";
  redirectUri: string;
}) {
  return new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    user_type: input.userType,
    redirect_uri: input.redirectUri,
  });
}

function config() {
  return {
    appId: process.env.GHL_OAUTH_APP_ID,
    clientId: process.env.GHL_OAUTH_CLIENT_ID,
    clientSecret: process.env.GHL_OAUTH_CLIENT_SECRET,
    installUrl: process.env.GHL_OAUTH_INSTALL_URL,
    redirectUri: process.env.GHL_OAUTH_REDIRECT_URI,
  };
}

export function getHighLevelOAuthConfigStatus() {
  const values = config();
  return {
    configured: Boolean(
      values.appId && values.clientId && values.clientSecret && values.installUrl && values.redirectUri,
    ),
    hasAppId: Boolean(values.appId),
    hasClientId: Boolean(values.clientId),
    hasClientSecret: Boolean(values.clientSecret),
    hasInstallUrl: Boolean(values.installUrl),
    hasRedirectUri: Boolean(values.redirectUri),
  };
}

export function assertHighLevelConnectionOwnership(
  connection: { id: number; userId: number } | undefined,
  userId: number,
  connectionId: number,
) {
  if (!connection || connection.id !== connectionId || connection.userId !== userId) {
    throw new Error("HighLevel connection not found.");
  }
  return connection;
}

export async function uninstallHighLevelApplication(
  input: { appId: string; locationId: string; accessToken: string },
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl(
    `https://services.leadconnectorhq.com/marketplace/app/${encodeURIComponent(input.appId)}/installations`,
    {
      method: "DELETE",
      headers: highLevelHeaders(input.accessToken),
      body: JSON.stringify({
        locationId: input.locationId,
        reason: "User disconnected HighLevel from Skootly",
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`HighLevel could not revoke this connection (${response.status}). Try again or uninstall Skootly in HighLevel.`);
  }
  const result = await response.json() as { success?: boolean };
  if (result.success !== true) {
    throw new Error("HighLevel did not confirm the app uninstall. Try again in a moment.");
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

function tokenContext(userId: number, locationId: string) {
  return `skootly:highlevel:${userId}:${locationId}`;
}

function sanitizeReturnPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value.slice(0, 240) : "/founder";
}

export async function createHighLevelOAuthStart(userId: number, returnPath = "/founder") {
  const values = config();
  if (!getHighLevelOAuthConfigStatus().configured || !values.installUrl) {
    throw new Error("HighLevel OAuth is not configured for this Skootly environment.");
  }
  const db = await requireDb();
  const state = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.insert(highLevelOAuthStates).values({
    userId,
    stateHash: hashOAuthState(state),
    returnPath: sanitizeReturnPath(returnPath),
    expiresAt: now + OAUTH_STATE_TTL_MS,
    createdAt: now,
  });
  const installUrl = new URL(values.installUrl);
  installUrl.searchParams.set("state", state);
  return { installUrl: installUrl.toString() };
}

async function exchangeToken(body: URLSearchParams, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Version: "v3",
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HighLevel token exchange failed (${response.status}).`);
  const parsed = JSON.parse(text) as Partial<TokenResponse>;
  if (!parsed.access_token || !parsed.refresh_token || !parsed.expires_in || !parsed.userType) {
    throw new Error("HighLevel returned an incomplete token response.");
  }
  return parsed as TokenResponse;
}

export async function completeHighLevelOAuth(
  currentUserId: number,
  code: string,
  state: string,
  fetchImpl: typeof fetch = fetch,
) {
  const values = config();
  if (!values.clientId || !values.clientSecret || !values.redirectUri) {
    throw new Error("HighLevel OAuth is not configured.");
  }
  const db = await requireDb();
  const stateHash = hashOAuthState(state);
  const now = Date.now();
  const stateRow = (
    await db
      .select()
      .from(highLevelOAuthStates)
      .where(
        and(
          eq(highLevelOAuthStates.stateHash, stateHash),
          eq(highLevelOAuthStates.userId, currentUserId),
        ),
      )
      .limit(1)
  )[0];
  if (!stateRow || !isHighLevelOAuthStateUsable(stateRow, currentUserId, now)) {
    throw new Error("HighLevel connection request expired or was already used.");
  }
  await db
    .update(highLevelOAuthStates)
    .set({ usedAt: now })
    .where(and(eq(highLevelOAuthStates.id, stateRow.id), eq(highLevelOAuthStates.userId, currentUserId)));

  const body = new URLSearchParams({
    client_id: values.clientId,
    client_secret: values.clientSecret,
    grant_type: "authorization_code",
    code,
    user_type: "Location",
    redirect_uri: values.redirectUri,
  });
  const token = await exchangeToken(body, fetchImpl);
  if (!token.locationId) throw new Error("HighLevel did not return a location for this installation.");
  const context = tokenContext(currentUserId, token.locationId);

  await db.transaction(async tx => {
    await tx
      .update(highLevelConnections)
      .set({ selected: false, updatedAt: now })
      .where(eq(highLevelConnections.userId, currentUserId));
    await tx
      .insert(highLevelConnections)
      .values({
        userId: currentUserId,
        locationId: token.locationId!,
        companyId: token.companyId || null,
        highLevelUserId: token.userId || null,
        userType: token.userType,
        encryptedAccessToken: encryptHighLevelToken(token.access_token, context),
        encryptedRefreshToken: encryptHighLevelToken(token.refresh_token, context),
        accessTokenExpiresAt: now + token.expires_in * 1000,
        refreshTokenExpiresAt: now + REFRESH_TOKEN_TTL_MS,
        scopes: token.scope || "",
        selected: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          companyId: token.companyId || null,
          highLevelUserId: token.userId || null,
          userType: token.userType,
          encryptedAccessToken: encryptHighLevelToken(token.access_token, context),
          encryptedRefreshToken: encryptHighLevelToken(token.refresh_token, context),
          accessTokenExpiresAt: now + token.expires_in * 1000,
          refreshTokenExpiresAt: now + REFRESH_TOKEN_TTL_MS,
          scopes: token.scope || "",
          selected: true,
          status: "active",
          lastSyncError: null,
          updatedAt: now,
        },
      });
  });
  return { returnPath: stateRow.returnPath };
}

export async function listHighLevelConnections(userId: number) {
  const db = await requireDb();
  return db
    .select({
      id: highLevelConnections.id,
      locationId: highLevelConnections.locationId,
      companyId: highLevelConnections.companyId,
      locationName: highLevelConnections.locationName,
      scopes: highLevelConnections.scopes,
      selected: highLevelConnections.selected,
      status: highLevelConnections.status,
      lastSyncAt: highLevelConnections.lastSyncAt,
      lastSyncError: highLevelConnections.lastSyncError,
      createdAt: highLevelConnections.createdAt,
    })
    .from(highLevelConnections)
    .where(eq(highLevelConnections.userId, userId))
    .orderBy(desc(highLevelConnections.selected), desc(highLevelConnections.updatedAt));
}

export async function selectHighLevelConnection(userId: number, connectionId: number) {
  const db = await requireDb();
  const owned = (
    await db
      .select({ id: highLevelConnections.id })
      .from(highLevelConnections)
      .where(
        and(
          eq(highLevelConnections.id, connectionId),
          eq(highLevelConnections.userId, userId),
        ),
      )
      .limit(1)
  )[0];
  if (!owned) throw new Error("HighLevel connection not found.");
  await db.transaction(async tx => {
    await tx
      .update(highLevelConnections)
      .set({ selected: false, updatedAt: Date.now() })
      .where(eq(highLevelConnections.userId, userId));
    await tx
      .update(highLevelConnections)
      .set({ selected: true, updatedAt: Date.now() })
      .where(
        and(
          eq(highLevelConnections.id, connectionId),
          eq(highLevelConnections.userId, userId),
        ),
      );
  });
}

export async function disconnectHighLevelConnection(
  userId: number,
  connectionId: number,
  fetchImpl: typeof fetch = fetch,
) {
  const db = await requireDb();
  const existing = (
    await db
      .select()
      .from(highLevelConnections)
      .where(
        and(
          eq(highLevelConnections.id, connectionId),
          eq(highLevelConnections.userId, userId),
        ),
      )
      .limit(1)
  )[0];
  assertHighLevelConnectionOwnership(existing, userId, connectionId);
  const appId = config().appId;
  if (!appId) throw new Error("HighLevel remote disconnect is not configured.");
  const access = await getHighLevelAccessForUser(userId, connectionId, fetchImpl);
  if (!access) throw new Error("HighLevel connection not found.");
  await uninstallHighLevelApplication({
    appId,
    locationId: existing.locationId,
    accessToken: access.accessToken,
  }, fetchImpl);
  await db
    .delete(highLevelConnections)
    .where(
      and(
        eq(highLevelConnections.id, connectionId),
        eq(highLevelConnections.userId, userId),
      ),
    );
  if (existing.selected) {
    const next = (
      await db
        .select({ id: highLevelConnections.id })
        .from(highLevelConnections)
        .where(eq(highLevelConnections.userId, userId))
        .orderBy(desc(highLevelConnections.updatedAt))
        .limit(1)
    )[0];
    if (next) await selectHighLevelConnection(userId, next.id);
  }
}

async function refreshConnection(connection: HighLevelConnection, fetchImpl: typeof fetch) {
  const values = config();
  if (!values.clientId || !values.clientSecret || !values.redirectUri) {
    throw new Error("HighLevel OAuth is not configured.");
  }
  if (connection.refreshTokenExpiresAt < Date.now()) {
    throw new Error("HighLevel connection expired. Reconnect the account.");
  }
  const context = tokenContext(connection.userId, connection.locationId);
  const refreshToken = decryptHighLevelToken(connection.encryptedRefreshToken, context);
  const body = buildHighLevelRefreshBody({
    clientId: values.clientId,
    clientSecret: values.clientSecret,
    refreshToken,
    userType: connection.userType,
    redirectUri: values.redirectUri,
  });
  const token = await exchangeToken(body, fetchImpl);
  const now = Date.now();
  const db = await requireDb();
  await db
    .update(highLevelConnections)
    .set({
      encryptedAccessToken: encryptHighLevelToken(token.access_token, context),
      encryptedRefreshToken: encryptHighLevelToken(token.refresh_token, context),
      accessTokenExpiresAt: now + token.expires_in * 1000,
      refreshTokenExpiresAt: now + REFRESH_TOKEN_TTL_MS,
      scopes: token.scope || connection.scopes,
      status: "active",
      lastSyncError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(highLevelConnections.id, connection.id),
        eq(highLevelConnections.userId, connection.userId),
      ),
    );
  return token.access_token;
}

export async function getHighLevelAccessForUser(
  userId: number,
  connectionId?: number,
  fetchImpl: typeof fetch = fetch,
) {
  const db = await requireDb();
  const conditions = [eq(highLevelConnections.userId, userId)];
  if (connectionId) conditions.push(eq(highLevelConnections.id, connectionId));
  else conditions.push(eq(highLevelConnections.selected, true));
  const connection = (
    await db
      .select()
      .from(highLevelConnections)
      .where(and(...conditions))
      .orderBy(desc(highLevelConnections.updatedAt))
      .limit(1)
  )[0];
  if (!connection) return null;
  const accessToken =
    connection.accessTokenExpiresAt <= Date.now() + ACCESS_REFRESH_BUFFER_MS
      ? await refreshConnection(connection, fetchImpl)
      : decryptHighLevelToken(
          connection.encryptedAccessToken,
          tokenContext(userId, connection.locationId),
        );
  return { connection, accessToken };
}

export async function markHighLevelSync(
  userId: number,
  connectionId: number,
  error?: string,
) {
  const db = await requireDb();
  await db
    .update(highLevelConnections)
    .set({
      lastSyncAt: error ? undefined : Date.now(),
      lastSyncError: error ? error.slice(0, 500) : null,
      status: error ? "error" : "active",
      updatedAt: Date.now(),
    })
    .where(
      and(
        eq(highLevelConnections.id, connectionId),
        eq(highLevelConnections.userId, userId),
      ),
    );
}
