# External App and MCP Rollout Checklist

Skootly should not publish a ChatGPT app, Manus Open App, or remote MCP interface until the following are complete.

| Area | Required evidence |
| --- | --- |
| Product policy | Published privacy policy, terms, support contact, and a plain-language explanation of what Skootly reads and writes. |
| OAuth | Registered client IDs, exact production redirect URIs, PKCE, short-lived access tokens, refresh-token rotation where available, and server-only secret storage. |
| MCP tools | Read-only tools first: current Skoot, active actions, outcomes, approved learning-source citations, and user-provided group links. |
| Writes | Every create, complete, skip, outcome, or note action must display its payload and require a fresh user confirmation. |
| Tenant security | Token-to-user binding, scope checks, rate limits, audit events, revoked-token behavior, and cross-user denial tests. |
| Review assets | Test account, scoped demo data, security contact, screenshots, tool descriptions, support workflow, and staged beta access. |
| Release sequence | Private developer testing → invited pilot users → security review → public listing only after the provider’s own review path is satisfied. |

The current codebase includes the constrained external tool contract and the in-app private Skoot companion. It does **not** yet expose a public OAuth or remote MCP endpoint, so no client data is externally connectable by default.
