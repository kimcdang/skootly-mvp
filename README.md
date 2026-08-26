# Skootly MVP

**Skootly finds what’s blocking you and gives you your next move.** This repository contains the full-stack validation MVP for three configuration-driven experiences: Founders, Coaches, and Client Success teams.

## Product contract

Skootly turns a short check-in into one bottleneck, one primary Skoot, one optional secondary Skoot, and no more than three **Not Today** items. It persists check-ins, recommendations, completion state, outcomes, momentum, validation feedback, and experiment events in a user-isolated database.

## Stack

The app uses React 19, Tailwind CSS 4, Express, tRPC, Drizzle ORM, MySQL/TiDB, Manus authentication, and the built-in LLM gateway. The GoHighLevel integration supports a founder-only Private Integration Token for testing and includes the production foundation for per-user OAuth connections with encrypted, rotating tokens.

## Local development

```bash
pnpm install
pnpm dev
```

Run the verification suite before opening a pull request:

```bash
pnpm check
pnpm test
pnpm build
```

Never commit `.env` files, API keys, OAuth client secrets, CRM tokens, database URLs, or generated build output. The repository `.gitignore` already excludes these paths.

## Collaboration with Aaron

Use `main` as the stable branch. Each collaborator should create a short-lived feature branch, commit one coherent change at a time, and open a pull request for review. Aaron can continue prototyping interaction ideas in Lovable, then contribute accepted changes through GitHub rather than maintaining a separate production backend.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the branch and handoff workflow.

## HighLevel customer connections

Customer-facing CRM connections must use HighLevel OAuth, not a shared Private Integration Token. Create a private Marketplace app for development, target sub-accounts, request only the required read-only scopes, and configure:

```text
GHL_OAUTH_CLIENT_ID
GHL_OAUTH_CLIENT_SECRET
GHL_OAUTH_APP_ID
GHL_OAUTH_INSTALL_URL
GHL_OAUTH_REDIRECT_URI
```

The production redirect URI should be:

```text
https://skootly.com/api/integrations/highlevel/callback
```

Request `contacts.readonly`, `opportunities.readonly`, and `oauth.write`. The final scope enables the official Marketplace App Uninstall API so disconnecting removes Skootly’s access from that specific HighLevel location before encrypted local tokens are deleted.

Skootly hashes single-use OAuth state, encrypts access and refresh tokens at rest, rotates refresh tokens, and scopes every connection operation to the authenticated Skootly user and selected HighLevel location. The detailed design is in [docs/highlevel-multitenant.md](./docs/highlevel-multitenant.md).

## Hosting and skootly.com

This codebase depends on Manus authentication, managed database services, and the built-in LLM gateway. The compatible release path is therefore **Manus hosting with a custom domain**, while GitHub remains the source of truth. A direct Vercel deployment would require replacing or externally configuring those managed services first.

After a final checkpoint, publish from the Manus Management UI. In **Settings → Domains**, add both `skootly.com` and `www.skootly.com`. Copy the exact DNS records shown there into Namecheap **Advanced DNS**. Preserve all existing MX and email-related TXT records, remove only conflicting web-hosting A/CNAME records, and verify both hostnames after DNS propagation.

## Architecture notes

- [Experiment architecture](./docs/experiment-architecture.md)
- [HighLevel multi-tenant design](./docs/highlevel-multitenant.md)
