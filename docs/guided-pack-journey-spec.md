# Guided Skoot Pack Journey — Incremental Implementation

## Decision Model

Skootly behaves as a transformation GPS:

`Creator Pack = Point B and method → Student context = Point A → Skootly determines route → Skoot is the next turn.`

The core loop stays fixed:

`Point A → bottleneck → one primary Skoot + one optional supporting Skoot → outcome → next bottleneck → Point B.`

## Entry States

| Student state | First meaningful screen | First question |
| --- | --- | --- |
| Assigned approved Creator Pack, no active Skoot | Pack destination and a one-question-at-a-time Point A diagnostic | A Pack milestone or decision rule question not already answered by current context. |
| No assigned Pack, no active Skoot | Existing progressive generic check-in | Outcome first, then bottleneck, then optional context. |
| Active Skoot | Existing focus view with stronger hierarchy | No onboarding. The primary Skoot is first. |

No route starts with a generic blank chat or a request to pick a Pack. Chat and the prompt composer stay available below the prescribed action as execution support.

## Pack-Aware Diagnosis

The Pack destination is taken from the creator-owned Pack description or transformation field. Questions are derived only from approved Pack `milestone`, `diagnostic_rule`, and `decision_rule` knowledge. Skootly asks one question at a time and stores a student-owned response. It stops as soon as the answer supports a responsible next Skoot.

Before asking, the system checks existing Skoots, outcomes, imported lesson context, CRM context, current workspace history, and saved Pack diagnostic answers. It must not ask a student to repeat known data.

## Screen Hierarchy

The default student screen is ordered visually as:

1. **Destination**
2. **Where you are**
3. **Current bottleneck**
4. **Your Next Skoot**
5. **Outcome**

Pack provenance is quiet, for example: “Powered by [Creator]’s [Pack] · Version [N] · Updated [date].” The optional supporting action and Not Today material are subordinate to the primary Skoot.

## Smart Escalation Boundary

The system checks, in order: active Pack rule, CSM support, then main coach expertise. A breakdown is surfaced only after an explicit support request, strategy need, or persistence evidence. Booking uses a creator-owned HTTPS URL; there is no calendar integration. Any post-call Pack update remains a pending creator proposal until approved.

## Privacy

Creator intelligence and Content Skoots aggregate only anonymized patterns. Student names, private conversations, recordings, screenshots, business details, and performance results are never used for public content by default. Publishing is outside this update.
