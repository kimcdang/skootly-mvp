import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { isAllowedMcpOrigin, MCP_ISSUER, MCP_TOOLS, parseMcpScopes, supportsPublicClientTokenExchange, verifyPkceS256 } from "./mcpServer";

describe("Skootly MCP protocol safeguards", () => {
  it("keeps scopes small and rejects unknown permission requests", () => {
    expect(parseMcpScopes()).toEqual(["skootly.packs.read"]);
    expect(parseMcpScopes("skootly.packs.read skootly.packs.feedback")).toEqual(["skootly.packs.read", "skootly.packs.feedback"]);
    expect(parseMcpScopes("skootly.packs.read admin:all")).toBeNull();
  });

  it("requires an exact S256 PKCE verifier match for authorization code exchange", () => {
    const verifier = "long-random-pkce-verifier-which-is-not-a-password";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256("different-verifier", challenge)).toBe(false);
  });

  it("accepts only known AI origins when an Origin header is supplied", () => {
    expect(isAllowedMcpOrigin("https://chatgpt.com")).toBe(true);
    expect(isAllowedMcpOrigin("https://manus.im")).toBe(true);
    expect(isAllowedMcpOrigin("https://attacker.example")).toBe(false);
  });

  it("makes Pack reads available while requiring a confirmation flow for feedback", () => {
    const names = MCP_TOOLS.map(tool => tool.name);
    expect(names).toEqual(["get_active_pack", "get_current_next_skoot", "get_pack_progress", "prepare_pack_feedback", "confirm_pack_feedback"]);
    expect(MCP_TOOLS.slice(0, 3).every(tool => tool.annotations.readOnlyHint)).toBe(true);
    expect(MCP_TOOLS.slice(3).every(tool => !tool.annotations.readOnlyHint)).toBe(true);
    expect(MCP_TOOLS.find(tool => tool.name === "confirm_pack_feedback")?.inputSchema.required).toEqual(["confirmationToken", "confirmed"]);
  });

  it("accepts ChatGPT’s documented CIMD public-client method intersection without accepting a private-key-only client", () => {
    expect(supportsPublicClientTokenExchange({ token_endpoint_auth_method: "private_key_jwt", token_endpoint_auth_methods_supported: ["none", "private_key_jwt"] })).toBe(true);
    expect(supportsPublicClientTokenExchange({ token_endpoint_auth_method: "private_key_jwt", token_endpoint_auth_methods_supported: ["private_key_jwt"] })).toBe(false);
    expect(MCP_ISSUER).toBe("https://skootly.com");
  });
});
