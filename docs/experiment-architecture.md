# Skootly Experiment Architecture

Skootly is one application with one authenticated data layer and one recommendation engine. Product experiments are configuration, not forks. A new version should add an experiment identifier, route, copy, form labels, recommendation priorities, and optional clearly labeled demo fixtures while reusing the shared check-in, recommendation, action, outcome, event, and validation-feedback infrastructure.

| Layer | Shared across experiments | Configurable per experiment |
| --- | --- | --- |
| Identity | Authentication, user isolation, session handling | None |
| Decision engine | Structured LLM contract, validation, persistence, outcome loop | Priority rules and terminology |
| Product workflow | Check-in, recommendation, completion, outcome, history | Questions, labels, contextual hints |
| Interface | Design tokens, cards, controls, focus hierarchy | Positioning, accent color, sample fixtures |
| Validation | Events, feedback form, comparison totals | Experiment identifier |

To add Version D, extend `EXPERIMENT_VERSIONS` and `EXPERIMENTS` in `shared/experiments.ts`, register its route, and supply any experiment-specific demo fixture. Database rows and events must carry the new experiment identifier. If database enums remain in use, add the new value through a migration before releasing the route.

The recommendation contract permits only one bottleneck, one required primary action, one optional secondary action, and three “Not Today” items. When the model lacks enough context, it must return one high-value clarifying question rather than speculative advice.

GoHighLevel remains an optional server-side context source. Skootly requests only scoped read access, aggregates records into business-level counts and signals, and provides the LLM with the concise summary rather than raw CRM payloads.

