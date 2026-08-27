# Skootly — Freight to Freedom Action Engine Update

## Objective

Extend the existing Skootly Founder experience with a compact, reusable **business action engine**. Skootly sits above GoHighLevel as a decision layer. It ingests a small server-normalized set of CRM signals, ranks one primary action and no more than one optional supporting action, stores the recommendation and eventual result, and shows the operator where to work next.

> **Skootly answers one question: What is the highest-leverage move to make now?**

## Scope

Reuse the existing Skootly authentication, Founder workspace, HighLevel connection model, `skoots` and `skoot_outcomes` records, mascot, outcome flow, and visual language. Do not build a CRM mirror, marketplace, billing, public Drops, autonomous agents, broad reporting dashboard, or external ChatGPT/MCP integration in this update.

| Existing primitive | Action-engine role |
| --- | --- |
| `skoots` | Reusable action record, extended with action-engine metadata and lifecycle states. |
| `skoot_outcomes` | Persisted signal → action → result evidence. |
| HighLevel connection + normalized snapshot | Compact CRM source. Never expose a token or replicate full contact history. |
| Skoot conversation | One contextual channel for explaining the top action, acknowledging updates, and logging a result. |
| Skoot Packs | Optional future playbook source. This release includes one internal default playbook only. |

## Data Model

Add a user-owned `business_profile` per company/workspace. It stores company name, primary goal, monthly revenue goal, primary offer, offer price, primary acquisition channel, notes, current bottleneck, and optional default playbook ID.

Extend or relate the existing Skoot action record with the following action-engine fields: company ID, title, description, priority score, source, signal summary, recommended action, estimated value, assigned owner, related HighLevel contact IDs, related authorized HighLevel URLs, status, completion time, outcome value, learning note, and optional playbook ID. The allowed lifecycle is `recommended`, `in_progress`, `completed`, and `dismissed`.

## Signal and Ranking Rules

Create a server-side `generateNextActions()` service. It receives only normalized, bounded CRM signals and an owned business profile. It returns at most two persisted actions: one primary move and one optional supporting move.

Use deterministic scoring first:

`priority score = urgency × revenue opportunity × conversion likelihood`

Signals may include recently created leads, leads with no follow-up beyond a defined time window, explicitly identifiable webinar leads, open opportunities, stale opportunities, pipeline stage, last known activity, and opportunity value. The engine must not infer a webinar cohort, activity, contact URL, or revenue amount when unavailable.

An LLM is optional only after deterministic filtering; if used, it receives the compact top candidates and business-memory summary—not raw CRM history. Do not regenerate an action list on page load. Reuse the persisted list until an operator requests refresh, important CRM context changes, or an action is completed/dismissed.

## Freight to Freedom Workspace

Add `/freight-to-freedom` as a branded Skootly client workspace. Its primary heading is:

> **Good morning. Here’s where the money is today.**

The left/main area presents one primary visually dominant action and an optional supporting action. Each action shows the title, concise why, potential opportunity, related lead links when HighLevel supplied an authorized URL, and controls to start, mark done, dismiss, or record a result. The small right panel shows the active goal, current bottleneck, and recent wins. This is not a CRM dashboard.

## Conversation and Future Tool Boundaries

The existing private Skoot conversation may explain why an action ranks first, acknowledge a status update such as “Zane is handling this,” or turn a completed action into a detailed outcome record. It uses compact persisted summaries and recent actions only.

Keep these server-owned boundaries ready for a later external connection, without exposing them yet: `get_next_actions`, `get_action_details`, `complete_action`, `record_action_outcome`, and `get_business_snapshot`. Reads are scoped to the authenticated owner; future writes must require fresh explicit confirmation.

## Acceptance Test

Drew should be able to open `/freight-to-freedom` and, within five seconds, understand the top action, why it matters, which leads/opportunities are involved, where to work those leads, and how to record the result. The expected loop is:

`Open Skootly → see next action → execute → record result → generate the next action.`
