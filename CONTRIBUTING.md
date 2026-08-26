# Contributing to Skootly

## Shared workflow

The GitHub repository is the source of truth. Do not copy production secrets or database exports into Lovable, pull requests, screenshots, or chat messages.

1. Pull the latest `main` branch.
2. Create a branch such as `kim/focus-copy` or `aaron/onboarding-idea`.
3. Keep the change focused and update or add Vitest coverage where behavior changes.
4. Run `pnpm check`, `pnpm test`, and `pnpm build`.
5. Open a pull request explaining the user problem, the chosen change, and how it was verified.
6. Merge only after review; delete the feature branch afterward.

## Working with Manus and Lovable

Kim can continue building the production app with Manus. Aaron may use Lovable to prototype visual or interaction ideas, but accepted work should return through a GitHub branch or a clearly scoped design handoff. Avoid creating a second database, auth layer, AI recommendation engine, or GoHighLevel token store in the prototype.

## Product guardrails

Every change should preserve the core constraint: Skootly recommends no more than one primary action and one optional secondary action. New experiments should extend the shared experiment configuration rather than duplicate infrastructure.
