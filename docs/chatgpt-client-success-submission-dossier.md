# Skootly ChatGPT Plugin Submission Dossier

**Public-facing workflow:** **Manage Client Success Through Chat**  
**Product name:** Skootly Client Success  
**Submission posture:** **Preparation only. Do not submit until every production gate below is complete.**

## What the plugin should do

Skootly Client Success helps an authenticated coach, consultant, or client-success operator identify which client needs attention, why they are blocked, and the single highest-leverage next intervention. It should answer questions such as, “Which clients need me this week?” and “What is the next Skoot for this client?” It should not become a generic CRM, expose raw private conversation history, or perform unconfirmed external actions.

## Minimum v1 tool inventory

| Tool | User intent | Data returned | Side effects | Required annotation |
| --- | --- | --- | --- | --- |
| `get_client_success_snapshot` | “What needs attention today?” | Tenant-scoped count, top reasons, and concise priority summary | None | Read-only |
| `list_clients_needing_attention` | “Which clients are stuck or at risk?” | Only authorized client label, current Pack milestone, explicit stuck signal, and recommended intervention | None | Read-only |
| `get_client_next_skoot` | “What should I do for this client next?” | One recommended operator Skoot, short rationale, and permitted source attribution | None | Read-only |
| `get_client_progress` | “Where is this client in their Pack?” | Enrolled Pack/version, current milestone, completion state, and declared feedback only | None | Read-only |
| `draft_client_follow_up` | “Help me draft the next client follow-up.” | A proposed private Skoot/follow-up draft that is not saved or sent | None | Read-only |

The initial submission must **exclude** email/SMS sending, external CRM writes, account management, student invitation creation, publishing, calendar booking, bulk export, raw conversations, raw learning imports, passwords, tokens, or any irreversible workflow. A future `save_private_follow_up_draft` could be added only after explicit user confirmation and separate review; it remains a private-system write (`readOnlyHint: false`, `openWorldHint: false`, `destructiveHint: false`).

## Data and permission boundaries

Every tool must resolve one authenticated Skootly account, then authorize creator-to-student relationships before returning data. Responses should remove internal IDs, access tokens, raw private conversations, raw diagnostic answers, unnecessary timestamps, and unrelated students. The application must disclose that ChatGPT can pass the user’s explicit question and relevant connected-app context to Skootly, while Skootly returns only the least data needed for the requested Client Success answer.

## OAuth and MCP requirements

The current Skootly password login is a website session and is **not** sufficient for a public ChatGPT plugin. Before implementation or review submission, Skootly needs a proven OAuth 2.1 authorization provider or service that supports authorization-code + PKCE (S256), OpenID Connect discovery, user info with `email_verified`, resource/audience binding, token expiry/revocation, and a stable public HTTPS MCP endpoint. The MCP server must expose protected-resource metadata, return OAuth authorization challenges on unauthenticated calls, and validate issuer, audience/resource, expiry, scopes, and user authorization on every request. [1] [2]

Use a universal MCP server URL such as `https://api.skootly.com/mcp` only after that host is live, stable, and independently tested. Do not register a placeholder or temporary tunnel in the OpenAI submission portal. [1]

## Store-listing draft

| Field | Draft |
| --- | --- |
| Plugin name | Skootly Client Success |
| Tagline | Manage Client Success Through Chat |
| Short description | Find the client who needs you next and get one clear, private intervention to move them forward. |
| Long description | Skootly Client Success brings your private, authorized client progress into ChatGPT so you can identify where attention matters, understand the current bottleneck, and act on one useful next step. It does not replace your CRM or expose full client conversations. |
| Category | Productivity or Business |
| Starter prompt 1 | “Which of my authorized clients needs my attention most this week, and why?” |
| Starter prompt 2 | “What is the most useful next Skoot for this client?” |
| Starter prompt 3 | “Show me the current Pack progress and any explicit stuck signal for this client.” |
| Starter prompt 4 | “Draft a concise, private follow-up Skoot for the client who is most blocked.” |
| Starter prompt 5 | “Summarize the recurring, anonymized reasons clients are getting stuck.” |

## Reviewer test plan

| Type | Prompt or scenario | Expected behavior |
| --- | --- | --- |
| Positive | “Which client needs attention?” | OAuth link is requested; server returns only the authenticated creator’s authorized students and concise attention reasons. |
| Positive | “What should I do for client A next?” | Server returns one private operator Skoot, rationale, and allowed Pack/milestone attribution. |
| Positive | “Show client A’s Pack progress.” | Server returns version, milestone, completion state, and explicit feedback only. |
| Positive | “Draft a follow-up.” | Server returns an unsaved draft; it does not message, save, or contact the client. |
| Positive | “What patterns are recurring?” | Server returns only anonymized aggregate categories when cohort thresholds are met. |
| Negative | Ask for another creator’s client by guessed name/ID. | Server denies access without confirming whether that person exists. |
| Negative | Ask for raw client conversation, transcript, password, access token, or diagnostic answers. | Server refuses and explains that private raw data is not available through the plugin. |
| Negative | Ask the plugin to send a message, create a booking, post content, or change a Pack. | Server refuses in v1 because the plugin has no write tools. |

## Submission gates

| Gate | Current status |
| --- | --- |
| Verified developer/business identity and Apps Management write access | Requires account-owner completion in OpenAI Platform. |
| Public website, support, privacy, and terms URLs | Website exists; support email/contact and legal review remain required. |
| Production OAuth 2.1 authorization server | Not yet selected or configured. |
| Stable public HTTPS MCP server | Not yet implemented. |
| OAuth metadata, resource metadata, PKCE, token checks, and revocation | Not yet implemented. |
| Reviewer demo account with safe sample data and no MFA | Not yet provisioned. |
| Five positive and three negative test cases | Defined above; must be run against production-like staging. |
| Accurate tool annotations and privacy minimization review | Defined above; must be validated against implemented tools. |
| OpenAI portal draft and final submission | Requires browser/account access and explicit user confirmation. |

## Recommended implementation sequence

1. Finish the separate low-friction Pack Builder release and observe real creator use.
2. Choose a standards-compliant OAuth provider rather than creating a new identity provider from scratch.
3. Build and test the five read-only MCP tools against a reviewer-safe demo tenant.
4. Publish reviewed privacy, terms, and support pages with an actual monitored support contact.
5. Connect the MCP server in ChatGPT developer mode, execute the eight tests above, then complete the OpenAI submission draft and request confirmation before submission.

## References

[1]: https://developers.openai.com/plugins/deploy/submission "OpenAI Developers: Submit plugins"
[2]: https://developers.openai.com/plugins/build/auth "OpenAI Developers: Authentication"
[3]: https://developers.openai.com/plugins/build/mcp-server "OpenAI Developers: Build an MCP server"
[4]: https://developers.openai.com/plugins/app-guidelines "OpenAI Developers: Plugin guidelines"
