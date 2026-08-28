import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { confirmMcpFeedback, createMcpAuthorizationCode, createMcpFeedbackConfirmation, exchangeMcpAuthorizationCode, getMcpAccessToken, getMyPackExecution } from "./db";
import { createInviteToken } from "./packMvp";

export const MCP_RESOURCE = "https://skootly.com/mcp";
export const MCP_ISSUER = "https://skootly.com";
export const MCP_PROTOCOL_VERSION = "2025-11-25";
const MCP_SCOPES = ["skootly.packs.read", "skootly.packs.feedback"] as const;
type McpScope = typeof MCP_SCOPES[number];

type OAuthRequest = { clientId: string; clientName: string; redirectUri: string; scopes: McpScope[]; resource: string; codeChallenge: string; state?: string };
type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
type OAuthClientMetadata = { client_id?: string; client_name?: string; redirect_uris?: string[]; token_endpoint_auth_method?: string; token_endpoint_auth_methods_supported?: string[] };

const requestCookie = "skootly_mcp_authorize";
const cookieMaxAgeSeconds = 10 * 60;
const clientMetadataHosts = new Set(["chatgpt.com", "openai.com", "manus.im", "manus.com", "manus.computer"]);

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) { return { jsonrpc: "2.0", id: id ?? null, result }; }
function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }; }
function toolOutput(data: Record<string, unknown>, isError = false) { return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, ...(isError ? { isError: true } : {}) }; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character); }
function parseCookies(header?: string) { return Object.fromEntries((header || "").split(";").map(item => item.trim()).filter(Boolean).map(item => { const index = item.indexOf("="); return index < 0 ? [item, ""] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))]; })); }
function sign(value: string) { return createHmac("sha256", ENV.cookieSecret).update(value).digest("base64url"); }
function signedRequest(request: OAuthRequest) { const payload = Buffer.from(JSON.stringify(request)).toString("base64url"); return `${payload}.${sign(payload)}`; }
function verifiedRequest(value?: string): OAuthRequest | null { try { if (!value) return null; const [payload, signature] = value.split("."); if (!payload || !signature || !timingSafeEqual(Buffer.from(sign(payload)), Buffer.from(signature))) return null; return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthRequest; } catch { return null; } }
export function parseMcpScopes(value?: string) { const scopes = (value || "skootly.packs.read").split(" ").filter(Boolean); return scopes.every(scope => MCP_SCOPES.includes(scope as McpScope)) ? scopes as McpScope[] : null; }
function hasScope(scopes: string, scope: McpScope) { return scopes.split(" ").includes(scope); }
export function verifyPkceS256(verifier: string, challenge: string) { return createHash("sha256").update(verifier).digest("base64url") === challenge; }
export function sameOriginPost(req: Request) { const origin = req.headers.origin; return !origin || origin === MCP_ISSUER; }
export function supportsPublicClientTokenExchange(metadata: OAuthClientMetadata) {
  const methods = Array.isArray(metadata.token_endpoint_auth_methods_supported) ? metadata.token_endpoint_auth_methods_supported : [];
  return methods.length > 0 ? methods.includes("none") : (!metadata.token_endpoint_auth_method || metadata.token_endpoint_auth_method === "none");
}

async function getClientMetadata(clientId: string, redirectUri: string) {
  const clientUrl = new URL(clientId);
  if (clientUrl.protocol !== "https:" || !clientUrl.pathname || clientUrl.pathname === "/" || !clientMetadataHosts.has(clientUrl.hostname)) throw new Error("This MCP client is not an approved ChatGPT or Manus metadata host.");
  const response = await fetch(clientUrl, { redirect: "error", signal: AbortSignal.timeout(5_000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("The MCP client metadata document could not be verified.");
  const metadata = await response.json() as OAuthClientMetadata;
  if (metadata.client_id !== clientId || !Array.isArray(metadata.redirect_uris) || !metadata.redirect_uris.includes(redirectUri)) throw new Error("The MCP client metadata and redirect address do not match.");
  if (!supportsPublicClientTokenExchange(metadata)) throw new Error("This MCP client does not support Skootly’s PKCE public-client token exchange.");
  return { clientName: (metadata.client_name || "Connected AI").slice(0, 300) };
}

async function requireMcpUser(req: Request, res: Response) {
  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) { res.status(401).set("WWW-Authenticate", `Bearer resource_metadata="${MCP_ISSUER}/.well-known/oauth-protected-resource/mcp", scope="skootly.packs.read"`).json({ error: "invalid_token" }); return null; }
  const token = await getMcpAccessToken(match[1]);
  if (!token || token.resource !== MCP_RESOURCE) { res.status(401).set("WWW-Authenticate", `Bearer resource_metadata="${MCP_ISSUER}/.well-known/oauth-protected-resource/mcp", scope="skootly.packs.read"`).json({ error: "invalid_token" }); return null; }
  return token;
}

export const MCP_TOOLS = [
    { name: "get_active_pack", description: "Read the caller’s active Skootly Pack name, version, destination, and current state. Returns only the caller’s own authorized Pack context.", inputSchema: { type: "object", additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
    { name: "get_current_next_skoot", description: "Read exactly one current primary Skoot and an optional supporting Skoot from the caller’s active Pack milestone, including definition of done and Not Today guidance.", inputSchema: { type: "object", additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
    { name: "get_pack_progress", description: "Read the caller’s Pack milestone position and completion state. No other students, conversations, private notes, or credentials are returned.", inputSchema: { type: "object", additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
    { name: "prepare_pack_feedback", description: "Prepare an explicit Done, Stuck, or Not Today feedback confirmation for the current Pack milestone. This does not change Pack progress. Ask the user to review it before calling confirm_pack_feedback.", inputSchema: { type: "object", additionalProperties: false, required: ["feedbackStatus"], properties: { feedbackStatus: { type: "string", enum: ["done", "stuck", "not_today"] }, detail: { type: "string", maxLength: 1000 } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
    { name: "confirm_pack_feedback", description: "Record the exact Pack feedback previously prepared by the caller. Call only after the user has explicitly confirmed the visible feedback; Done advances one milestone, while Stuck and Not Today do not.", inputSchema: { type: "object", additionalProperties: false, required: ["confirmationToken", "confirmed"], properties: { confirmationToken: { type: "string", minLength: 40, maxLength: 200 }, confirmed: { type: "boolean", const: true } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  ];
export function isAllowedMcpOrigin(origin?: string) { return !origin || ["https://chatgpt.com", "https://chat.openai.com", "https://manus.im", "https://manus.com"].includes(origin); }

async function callTool(userId: number, scopes: string, name: string, args: Record<string, unknown>) {
  if (!hasScope(scopes, "skootly.packs.read")) return toolOutput({ error: "This connection is missing Pack read permission." }, true);
  const state = await getMyPackExecution(userId);
  if (name === "get_active_pack") return toolOutput(state ? { packName: state.packName, version: state.versionNumber, destination: state.blueprint?.destination || null, status: state.enrollment.status } : { activePack: null, message: "No active enrolled Pack." });
  if (name === "get_current_next_skoot") return toolOutput(state?.current ? { packName: state.packName, version: state.versionNumber, milestone: state.current.position, milestoneTitle: state.current.title, primarySkoot: state.current.defaultSkoot, supportingSkoot: state.current.supportingSkoot || null, definitionOfDone: state.current.definitionOfDone, feedbackPrompt: state.current.feedbackPrompt, resourceUrl: state.current.resourceUrl || null, notToday: state.current.notToday || state.blueprint?.notToday || null } : { currentSkoot: null, message: "No active Pack milestone is ready." });
  if (name === "get_pack_progress") return toolOutput(state ? { packName: state.packName, version: state.versionNumber, status: state.enrollment.status, currentMilestone: state.enrollment.currentMilestonePosition, totalMilestones: state.milestones.length, currentMilestoneTitle: state.current?.title || null } : { activePack: null, message: "No active enrolled Pack." });
  if (!hasScope(scopes, "skootly.packs.feedback")) return toolOutput({ error: "This connection is read-only. Reconnect with Pack feedback permission to prepare feedback." }, true);
  if (name === "prepare_pack_feedback") {
    const feedbackStatus = args.feedbackStatus;
    const detail = typeof args.detail === "string" ? args.detail.trim().slice(0, 1000) : undefined;
    if (feedbackStatus !== "done" && feedbackStatus !== "stuck" && feedbackStatus !== "not_today") return toolOutput({ error: "feedbackStatus must be done, stuck, or not_today." }, true);
    const prepared = await createMcpFeedbackConfirmation(userId, { feedbackStatus, detail, rawToken: createInviteToken() });
    return toolOutput({ ...prepared, requiresExplicitUserConfirmation: true, message: "Show this exact feedback to the user. Only call confirm_pack_feedback after they explicitly confirm it." });
  }
  if (name === "confirm_pack_feedback") {
    if (args.confirmed !== true || typeof args.confirmationToken !== "string") return toolOutput({ recorded: false, message: "Feedback was not recorded. Explicit confirmation is required." }, true);
    const recorded = await confirmMcpFeedback(userId, args.confirmationToken);
    return toolOutput({ ...recorded, message: recorded.feedbackStatus === "done" ? "Recorded. Skootly advanced the Pack only one milestone." : "Recorded. Your Pack milestone did not advance." });
  }
  return toolOutput({ error: "Unknown Skootly MCP tool." }, true);
}

export function registerMcpRoutes(app: { get: Function; post: Function }) {
  app.get("/.well-known/oauth-protected-resource/mcp", (_req: Request, res: Response) => res.set("Cache-Control", "public, max-age=300").json({ resource: MCP_RESOURCE, authorization_servers: [MCP_ISSUER], scopes_supported: MCP_SCOPES }));
  app.get("/.well-known/oauth-authorization-server", (_req: Request, res: Response) => res.set("Cache-Control", "no-store").json({ issuer: MCP_ISSUER, authorization_response_iss_parameter_supported: true, authorization_endpoint: `${MCP_ISSUER}/oauth/authorize`, token_endpoint: `${MCP_ISSUER}/oauth/token`, revocation_endpoint: `${MCP_ISSUER}/oauth/revoke`, response_types_supported: ["code"], grant_types_supported: ["authorization_code"], code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["none"], scopes_supported: MCP_SCOPES, client_id_metadata_document_supported: true }));
  app.get("/oauth/authorize", async (req: Request, res: Response) => {
    try {
      const { response_type, client_id, redirect_uri, scope, resource, code_challenge, code_challenge_method, state } = req.query;
      if (response_type !== "code" || typeof client_id !== "string" || typeof redirect_uri !== "string" || typeof resource !== "string" || typeof code_challenge !== "string" || code_challenge_method !== "S256") throw new Error("This connection request is missing required OAuth PKCE details.");
      if (resource !== MCP_RESOURCE) throw new Error("This connection requested a different resource.");
      const scopes = parseMcpScopes(typeof scope === "string" ? scope : undefined); if (!scopes) throw new Error("This connection requested an unsupported permission.");
      const metadata = await getClientMetadata(client_id, redirect_uri);
      const request: OAuthRequest = { clientId: client_id, clientName: metadata.clientName, redirectUri: redirect_uri, scopes, resource, codeChallenge: code_challenge, state: typeof state === "string" ? state.slice(0, 2000) : undefined };
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) { res.redirect(303, `/login?next=${encodeURIComponent(req.originalUrl)}`); return; }
      res.cookie(requestCookie, signedRequest(request), { httpOnly: true, secure: ENV.isProduction, sameSite: "lax", maxAge: cookieMaxAgeSeconds * 1000, path: "/oauth" });
      res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect ${escapeHtml(request.clientName)} to Skootly</title><style>body{font-family:system-ui;margin:0;background:#fff7ef;color:#181516}.card{max-width:620px;margin:8vh auto;padding:32px;border:3px solid #181516;border-radius:24px;background:#fff;box-shadow:8px 8px 0 #c9b7ff}button{background:#181516;color:#fff;padding:13px 18px;border:0;border-radius:12px;font-weight:700;font-size:16px}a{color:#181516}.scope{background:#e0f6e9;padding:14px;border-radius:12px}</style></head><body><main class="card"><p><b>SKOOTLY CONNECTION</b></p><h1>Connect ${escapeHtml(request.clientName)}?</h1><p>This lets the connected AI read only your active Skootly Pack, current next Skoot, and progress.</p><p class="scope"><b>Requested permissions:</b> ${request.scopes.map(escapeHtml).join(", ")}</p><p>You can revoke this connection in Skootly at any time. It cannot view other people’s Packs, your conversations, or credentials.</p><form method="post" action="/oauth/authorize"><button name="decision" value="approve">Connect to Skootly</button> <button name="decision" value="deny" style="background:#fff;color:#181516;border:2px solid #181516">Cancel</button></form></main></body></html>`);
    } catch (error) { res.status(400).type("html").send(`<h1>Skootly connection unavailable</h1><p>${escapeHtml(error instanceof Error ? error.message : "Invalid authorization request.")}</p>`); }
  });
  app.post("/oauth/authorize", async (req: Request, res: Response) => {
    try {
      if (!sameOriginPost(req)) { res.status(403).send("Invalid connection origin."); return; }
      const request = verifiedRequest(parseCookies(req.headers.cookie)[requestCookie]); const user = await sdk.authenticateRequest(req).catch(() => null);
      res.clearCookie(requestCookie, { path: "/oauth" });
      if (!request || !user) throw new Error("Your connection request expired. Start again from your AI connection settings.");
      const decision = typeof req.body?.decision === "string" ? req.body.decision : "deny";
      const redirect = new URL(request.redirectUri);
      if (decision !== "approve") { redirect.searchParams.set("error", "access_denied"); redirect.searchParams.set("iss", MCP_ISSUER); if (request.state) redirect.searchParams.set("state", request.state); res.redirect(303, redirect.toString()); return; }
      const code = randomBytes(32).toString("base64url"); await createMcpAuthorizationCode({ userId: user.id, clientId: request.clientId, clientName: request.clientName, redirectUri: request.redirectUri, scopes: request.scopes, resource: request.resource, codeChallenge: request.codeChallenge, rawCode: code });
      redirect.searchParams.set("code", code); redirect.searchParams.set("iss", MCP_ISSUER); if (request.state) redirect.searchParams.set("state", request.state); res.redirect(303, redirect.toString());
    } catch (error) { res.status(400).type("html").send(`<h1>Skootly connection unavailable</h1><p>${escapeHtml(error instanceof Error ? error.message : "Invalid authorization request.")}</p>`); }
  });
  app.post("/oauth/token", async (req: Request, res: Response) => {
    try {
      const { grant_type, code, client_id, redirect_uri, code_verifier, resource } = req.body || {};
      if (grant_type !== "authorization_code" || typeof code !== "string" || typeof client_id !== "string" || typeof redirect_uri !== "string" || typeof code_verifier !== "string" || typeof resource !== "string") throw new Error("Invalid token request.");
      const pending = await (await import("./db")).getMcpAuthorizationCode(code);
      if (!pending || pending.clientId !== client_id || pending.redirectUri !== redirect_uri || pending.resource !== resource || !verifyPkceS256(code_verifier, pending.codeChallenge)) throw new Error("Authorization code is invalid or expired.");
      const accessToken = randomBytes(32).toString("base64url"); const token = await exchangeMcpAuthorizationCode({ rawCode: code, clientId: client_id, redirectUri: redirect_uri, rawAccessToken: accessToken });
      res.set("Cache-Control", "no-store").json({ access_token: accessToken, token_type: "Bearer", expires_in: Math.floor((token.expiresAt - Date.now()) / 1000), scope: token.scopes });
    } catch (error) { res.status(400).set("Cache-Control", "no-store").json({ error: "invalid_grant", error_description: error instanceof Error ? error.message : "Invalid token request." }); }
  });
  app.post("/oauth/revoke", async (req: Request, res: Response) => { const rawToken = typeof req.body?.token === "string" ? req.body.token : ""; if (rawToken) { const token = await getMcpAccessToken(rawToken); if (token) { const { revokeMyMcpConnection } = await import("./db"); await revokeMyMcpConnection(token.userId, token.id); } } res.status(200).set("Cache-Control", "no-store").send(); });
  app.get("/mcp", (_req: Request, res: Response) => res.status(405).set("Allow", "POST").send());
  app.post("/mcp", async (req: Request, res: Response) => {
    if (!isAllowedMcpOrigin(req.headers.origin)) { res.status(403).json(jsonRpcError(null, -32000, "Untrusted origin.")); return; }
    const token = await requireMcpUser(req, res); if (!token) return;
    const requestedProtocol = req.headers["mcp-protocol-version"];
    if (requestedProtocol && requestedProtocol !== MCP_PROTOCOL_VERSION) { res.status(400).json(jsonRpcError(null, -32600, "Unsupported MCP protocol version.")); return; }
    const request = req.body as JsonRpcRequest;
    if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") { res.status(400).json(jsonRpcError(null, -32600, "Invalid JSON-RPC request.")); return; }
    if (request.method.startsWith("notifications/")) { res.status(202).send(); return; }
    if (request.method === "initialize") { res.json(jsonRpcResult(request.id, { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "skootly", version: "0.1.0" }, instructions: "Use the smallest Pack tool that answers the user’s question. Never record feedback until the user explicitly confirms the prepared details." })); return; }
    if (request.method === "tools/list") { res.json(jsonRpcResult(request.id, { tools: MCP_TOOLS })); return; }
    if (request.method === "tools/call") {
      const name = request.params?.name; const args = request.params?.arguments;
      if (typeof name !== "string" || (args !== undefined && (typeof args !== "object" || Array.isArray(args)))) { res.json(jsonRpcError(request.id, -32602, "Tool name or arguments are invalid.")); return; }
      try { res.json(jsonRpcResult(request.id, await callTool(token.userId, token.scopes, name, (args || {}) as Record<string, unknown>))); } catch (error) { res.json(jsonRpcResult(request.id, toolOutput({ error: error instanceof Error ? error.message : "Skootly could not complete that tool call." }, true))); }
      return;
    }
    res.json(jsonRpcError(request.id, -32601, "Method not found."));
  });
}
