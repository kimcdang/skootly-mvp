# Verified ChatGPT Plugin Requirements

**Reviewed:** 2026-08-27

Skootly should be prepared as an authenticated, universal MCP-backed plugin—not as a legacy unscoped “plugin” endpoint. The public submission needs a verified developer or business identity, Apps Management write permission, a production HTTPS MCP URL, accurate public website, support, privacy-policy, and terms URLs, starter prompts, five positive and three negative reviewer test cases, availability settings, and release notes. The submission portal scans the server’s tool metadata and uses the supplied review materials. Submission starts review; it does not publish automatically. [1]

Because Skootly exposes customer-specific Client Success information, the MCP server must require OAuth 2.1. The server must expose protected-resource metadata, the authorization server must expose OAuth/OIDC discovery, PKCE S256 must be supported, the OAuth `resource` parameter must be preserved, and the MCP server must verify issuer, audience/resource, expiry, and scopes on every token. A production-ready implementation should advertise `openid` and `email`, return `email_verified` through UserInfo, and prefer CIMD or another supported ChatGPT client-registration path. [2]

Tool responses must be minimized to the client-success question. They must not return secrets, internal IDs, raw private conversations, diagnostic logs, or undisclosed data. Every tool must have accurate read-only, open-world, and destructive annotations. Initial Skootly tools should be read-only by default; any future action that changes Skootly data must be explicit, confirmation-gated, retry-safe where possible, and accurately annotated. [1] [3]

## Implication for the current Skootly release

The current password login is a web-app session, not a full OAuth 2.1 authorization server. It is not sufficient to submit an authenticated ChatGPT app. We should first add a dedicated OAuth authorization layer or configure a proven OAuth provider, deploy a stable MCP host, publish policy/support/terms pages, and build a reviewer-safe demo tenant. No customer data should be exposed to ChatGPT until those requirements are implemented and independently tested.

## MCP transport and authorization implementation notes — updated 2026-08-28

Skootly’s remote endpoint uses Streamable HTTP at one HTTPS `/mcp` URL, accepts JSON-RPC requests by `POST`, and returns an HTTP `401` Bearer challenge with protected-resource metadata when access is absent. The MCP specification requires HTTP transports to validate a supplied `Origin` header and recommends authenticated connections. Its OAuth model requires protected-resource metadata, OAuth authorization-server discovery, an OAuth 2.1 authorization-code flow with PKCE, resource binding, and least-privilege scopes. Skootly therefore exposes `skootly.packs.read` and optional `skootly.packs.feedback`, with all Pack feedback remaining an explicit two-step confirmation. [4] [5]

Skootly must not claim broad ChatGPT compatibility until a real ChatGPT client metadata document and redirect URI have been verified in developer mode. The external client’s OAuth metadata, exact redirect URI, and public-client PKCE flow must be validated before issuing a token. [4] [6]

## References

[1]: https://developers.openai.com/plugins/deploy/submission "OpenAI Developers: Submit plugins"
[2]: https://developers.openai.com/plugins/build/auth "OpenAI Developers: Authentication"
[3]: https://developers.openai.com/plugins/app-guidelines "OpenAI Developers: Plugin guidelines"
[4]: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization "Model Context Protocol: Authorization"
[5]: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports "Model Context Protocol: Transports"
[6]: https://developers.openai.com/api/docs/mcp "OpenAI: Building MCP servers for plugins and API integrations"
