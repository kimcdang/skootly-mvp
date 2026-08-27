import { buildHighLevelSummary, highLevelSnapshotSchema, type HighLevelSnapshot } from "../shared/highlevel";

const HIGHLEVEL_BASE_URL = "https://services.leadconnectorhq.com";
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

type FetchLike = typeof fetch;

type HighLevelOptions = {
  token?: string;
  locationId?: string;
  fetchImpl?: FetchLike;
  now?: number;
};

export function highLevelHeaders(token: string, version = "v3") {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Version: version,
  };
}

export function getHighLevelStatus() {
  const hasToken = Boolean(process.env.GHL_PRIVATE_INTEGRATION_TOKEN);
  const hasLocationId = Boolean(process.env.GHL_LOCATION_ID);
  return {
    configured: hasToken && hasLocationId,
    hasToken,
    hasLocationId,
    scopes: ["contacts.readonly", "opportunities.readonly"],
  };
}

export function highLevelFailureMessage(status: number, label: string) {
  if (status === 401) {
    return "Your GoHighLevel connection expired or was revoked. Reconnect the account and try again.";
  }
  if (status === 403) {
    return `Your GoHighLevel connection is missing the required read-only scope for ${label}. Reconnect it with the requested permissions.`;
  }
  return `GoHighLevel ${label} request failed (${status}).`;
}

async function readJson(response: Response, label: string) {
  if (!response.ok) {
    const body = await response.text();
    const detail = body.slice(0, 240).replace(/\s+/g, " ");
    const message = highLevelFailureMessage(response.status, label);
    throw new Error(`${message}${response.status === 401 || response.status === 403 || !detail ? "" : ` ${detail}`}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === "object") as Record<string, unknown>[] : [];
}

function numericValue(item: Record<string, unknown>) {
  const value = item.monetaryValue ?? item.value ?? item.amount ?? 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function updatedAt(item: Record<string, unknown>) {
  const value = item.updatedAt ?? item.lastStatusChangeAt ?? item.dateUpdated ?? item.createdAt;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function normalizeHighLevelSnapshot(
  contactsPayload: Record<string, unknown>,
  opportunitiesPayload: Record<string, unknown>,
  pipelinesPayload: Record<string, unknown>,
  locationId: string,
  capturedAt: number,
): HighLevelSnapshot {
  const contacts = asArray(contactsPayload.contacts);
  const opportunities = asArray(opportunitiesPayload.opportunities);
  const pipelines = asArray(pipelinesPayload.pipelines);
  const contactMeta = contactsPayload.meta && typeof contactsPayload.meta === "object"
    ? contactsPayload.meta as Record<string, unknown>
    : {};
  const contactTotalCandidate = contactsPayload.total ?? contactMeta.total;
  const contactTotal = Number(contactTotalCandidate);
  const open = opportunities.filter(item => {
    const status = String(item.status ?? "open").toLowerCase();
    return !["won", "lost", "abandoned", "closed"].includes(status);
  });
  const snapshotWithoutSummary = {
    locationId,
    capturedAt,
    contactCount: Number.isFinite(contactTotal) ? contactTotal : contacts.length,
    opportunityCount:
      typeof opportunitiesPayload.total === "number"
        ? opportunitiesPayload.total
        : opportunities.length,
    openOpportunityCount: open.length,
    totalOpenPipelineValue: open.reduce((sum, item) => sum + numericValue(item), 0),
    staleOpportunityCount: open.filter(item => {
      const date = updatedAt(item);
      return date > 0 && capturedAt - date > STALE_AFTER_MS;
    }).length,
    pipelineNames: pipelines
      .map(item => String(item.name ?? "").trim())
      .filter(Boolean)
      .slice(0, 20),
  };
  return highLevelSnapshotSchema.parse({
    ...snapshotWithoutSummary,
    summary: buildHighLevelSummary(snapshotWithoutSummary),
  });
}

export async function fetchHighLevelSnapshot(options: HighLevelOptions = {}) {
  const token = options.token ?? process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = options.locationId ?? process.env.GHL_LOCATION_ID;
  if (!token || !locationId) {
    throw new Error("GoHighLevel is not configured. Add the Private Integration Token and Location ID.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now();
  const encodedLocation = encodeURIComponent(locationId);

  const [contactsResponse, opportunitiesResponse, pipelinesResponse] = await Promise.all([
    fetchImpl(`${HIGHLEVEL_BASE_URL}/contacts/?locationId=${encodedLocation}&limit=100`, {
      method: "GET",
      headers: highLevelHeaders(token, "2021-07-28"),
    }),
    fetchImpl(`${HIGHLEVEL_BASE_URL}/opportunities/search`, {
      method: "POST",
      headers: highLevelHeaders(token),
      body: JSON.stringify({
        locationId,
        query: "",
        limit: 100,
        page: 0,
        searchAfter: [],
        additionalDetails: {
          notes: false,
          tasks: false,
          calendarEvents: false,
          unReadConversations: false,
        },
      }),
    }),
    fetchImpl(`${HIGHLEVEL_BASE_URL}/opportunities/pipelines?locationId=${encodedLocation}`, {
      method: "GET",
      headers: highLevelHeaders(token),
    }),
  ]);

  const [contacts, opportunities, pipelines] = await Promise.all([
    readJson(contactsResponse, "contacts"),
    readJson(opportunitiesResponse, "opportunities"),
    readJson(pipelinesResponse, "pipelines"),
  ]);

  return normalizeHighLevelSnapshot(contacts, opportunities, pipelines, locationId, now);
}

export async function fetchHighLevelActionPayloads(options: HighLevelOptions = {}) {
  const token = options.token ?? process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = options.locationId ?? process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error("GoHighLevel is not configured. Connect an account before generating actions.");
  const fetchImpl = options.fetchImpl ?? fetch;
  const encodedLocation = encodeURIComponent(locationId);
  const [contactsResponse, opportunitiesResponse] = await Promise.all([
    fetchImpl(`${HIGHLEVEL_BASE_URL}/contacts/?locationId=${encodedLocation}&limit=100`, { method: "GET", headers: highLevelHeaders(token, "2021-07-28") }),
    fetchImpl(`${HIGHLEVEL_BASE_URL}/opportunities/search`, {
      method: "POST",
      headers: highLevelHeaders(token),
      body: JSON.stringify({ locationId, query: "", limit: 100, page: 0, searchAfter: [], additionalDetails: { notes: false, tasks: false, calendarEvents: false, unReadConversations: false } }),
    }),
  ]);
  const [contacts, opportunities] = await Promise.all([readJson(contactsResponse, "contacts"), readJson(opportunitiesResponse, "opportunities")]);
  return { contacts, opportunities };
}
