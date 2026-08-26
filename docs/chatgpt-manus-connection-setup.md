# Connecting ChatGPT or Manus to Skootly

## Product stance

Skootly’s external companion should expose the **same private decision engine** that powers the web app. It begins with read-only conversation tools and only permits a write after the person sees and confirms the exact change. It does not expose cross-client data, automatically post to a community, or upload assets without a separate confirmed action.

## ChatGPT private beta path

The practical first step is a private remote MCP app. Register Skootly’s future HTTPS MCP endpoint in ChatGPT developer mode, authenticate with a Skootly OAuth account, and test with internal users before requesting broader distribution. The initial tool list should be `get_current_skoot`, `resolve_skoot_prompt`, and `get_learning_context`; all are read-only and scoped to the signed-in Skootly user.

The user-facing prompt can be as simple as:

> “Run the 5-Day Challenge Skoot Pack for my group.”

When the user has imported that Pack, ChatGPT should receive one action: create the requested 1084 × 576 cover banner, why it is the first move, citation to the Pack, and only the saved user-provided Group Settings link. It must not infer an administration path, scrape the community, or upload the file.

## Manus path

Create a standard **Team Open App** in Manus Integrations. Configure only `create_task` initially, use PKCE plus a server-side secret, and register the exact production callback URL:

```
https://skootly.com/api/oauth/manus/callback
```

The app creator and authorizers must be in the same Manus Team. A trusted public Open App is partner-only; do not seek broad scopes or trusted access for the initial Skootly pilot. Store the one-time client secret in managed project secrets and implement state validation, encrypted token storage, refresh rotation, revocation, and user disconnect before enabling the callback.

## Before enabling public connections

| Requirement | Why it matters |
| --- | --- |
| Production `skootly.com` domain | OAuth redirect URIs must be HTTPS and exact-match registered URLs. |
| Skootly privacy policy and terms | Explain client/coach visibility, retention, deletion, and external app access. |
| OAuth client registrations | ChatGPT remote MCP and Manus Open App require separate client credentials and redirect configuration. |
| Tenant-isolation tests | Every tool request must resolve only the authenticated Skootly user’s workspace. |
| Reviewable write confirmation | Any create, completion, or outcome tool must surface the complete proposed payload before execution. |

## Implementation status

The app now contains the read/write tool contract and tests that reject unconfirmed writes. The public remote MCP transport and OAuth callback should be enabled only after the production domain and each provider’s client registration are available.
