# Creator Skoot Packs — Incremental MVP

## Purpose

Add a small, versioned knowledge layer that lets a creator teach Skootly their current method once and gives assigned students the newest approved version automatically. The product loop is:

`Creator knowledge → approved pack version → student goal and state → one primary Skoot + one optional supporting Skoot → outcome → creator insight.`

This is an extension to Skootly’s decision engine—not a marketplace, a Custom GPT clone, or a generic chat product.

## Reused Product Primitives

| Existing primitive | Creator Pack role |
| --- | --- |
| Personal `skoot_packs` and steps | Remains available for a user’s private prompt-to-action flow. It is not repurposed or migrated. |
| Daily check-ins, recommendations, and Skoots | Supply each student’s goal, current state, bottleneck, and completion evidence. |
| `skoot_outcomes` | Stores execution evidence. Creator Pack attribution adds the “which rule influenced which outcome?” link. |
| Private Skoot conversation | Can explain a recommendation, but never exposes creator or other student private data. |

## Minimal New Model

Create a separate distribution model rather than overloading personal packs:

| Record | Purpose |
| --- | --- |
| `creator_skoot_packs` | A creator-owned pack name, description, and active version pointer. |
| `creator_skoot_pack_versions` | Immutable approved snapshot with sequential version number and approval timestamp. |
| `creator_pack_knowledge` | Versioned principles, rules, milestones, scripts, examples, and Not-Today guidance. |
| `creator_pack_proposals` | Pending natural-language changes that the creator can approve, edit, or cancel. |
| `creator_pack_assignments` | One creator-pack assignment per student, resolved to the newest approved version. |
| `creator_pack_attributions` | Links a student recommendation/Skoot to the applied pack version and rule. |

The first release assumes a signed-in user can create packs as a creator and assign them only to existing Skootly users by exact email. A creator cannot assign, read, alter, or view a student’s records without a valid assignment. There is no multi-creator editing.

## Creator Flow

1. The creator creates a named pack, for example **Launch Skoot Pack**.
2. They type an update in plain language. Example: “Students should conduct ten buyer interviews before building a webinar.”
3. Skootly proposes one concise rule in a selected knowledge category, for example: “If verified buyer interviews are below ten, prioritize interviews before webinar creation.”
4. The creator chooses **Add to Pack**, **Edit**, or **Cancel**. Only approval creates an immutable new version.
5. The current approved version becomes active immediately for assigned students.

The MVP uses deterministic parsing heuristics for classification and creates a reviewable proposal. It does not require a model to silently interpret or publish creator rules.

## Student Flow

On an assigned student’s workspace, Skootly obtains their current goal, state, bottleneck, recent outcomes, and the concise active creator-pack snapshot. It returns one primary action and, only if necessary, one supporting action. The interface displays:

> **Powered by [Creator]’s [Pack Name] · Version [N] · Updated [date]**

Every resulting recommendation records the source rule and version. The system must not claim a rule was applied when it was not available in the active approved version.

## Creator Insights

The Creator view is intentionally small. It lists only aggregate, assigned-student patterns: most common current bottleneck, frequent question themes, most-skipped Skoot title, and simple stored outcome totals. No predictive scores, broad analytics, or raw student private conversations are included.

## Explicitly Deferred

This release does not include public Pack discovery, marketplace pages, billing, payouts, royalties, affiliate tracking, multi-creator packs, advanced roles, complex permissions, automated learning, or advanced analytics.
