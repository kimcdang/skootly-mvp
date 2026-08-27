# Smart Escalation Skoots — Incremental MVP

## Product Rule

Skootly now determines **what should happen next and the lowest-cost person or system capable of helping**. The routing hierarchy is fixed:

`Student → assigned Skoot Pack / Skoot → CSM → Main Coach`

The ordinary Skootly loop remains unchanged:

`Goal → current state → bottleneck → one primary Skoot + one optional supporting Skoot → outcome → next bottleneck.`

Escalation is an exception path. It is appropriate only when the active Pack cannot responsibly resolve the issue, the student explicitly asks for a human, or the same bottleneck persists after meaningful execution.

## Reused Components

| Existing Skootly primitive | Smart Escalation usage |
| --- | --- |
| Creator Pack assignment and approved version | Provides the first knowledge layer and relevant rules for a student’s escalation brief. |
| Daily check-in, Skoot, and outcome records | Establishes the goal, state, bottleneck, prior action attempts, and execution evidence. |
| Private Skoot conversation | Records a student question and can make a private request for help. It is not visible to unrelated staff. |
| Creator Pack proposal review | Receives post-call suggested rules. A coach note never silently changes Pack knowledge. |
| Mascot/notification conventions | Surfaces a short, private escalation notification without creating a new notification system. |

## Minimal Data Model

| Record | Required data |
| --- | --- |
| Support profile | Creator owner, routing level (`csm` or `coach`), display name, optional booking URL, active state. |
| Escalation | Student, creator, related Skoot/recommendation, type (`csm` or `coach`), reason, helper, safe booking URL, status, timestamps. |
| Breakdown note | Escalation, coach owner, private notes, student-next-action suggestion, proposed Pack knowledge, review state. |
| Content Skoot | Creator owner, anonymized bottleneck pattern, count, suggested format and outline, status, explicit consent flag set to false. |

All records must be scoped to the assigned student and Pack creator. There are no shared global queues.

## Deterministic Routing

1. **Stay self-serve** when a relevant, approved Pack rule exists and the student has not repeatedly skipped or failed the related Skoot.
2. **Route to CSM** if the student needs accountability, navigation, or a simple unblock that does not require the creator’s specialist method.
3. **Route to Main Coach** when the student requests a breakdown, the bottleneck is marked as strategy/diagnosis, or the same bottleneck persists after two completed or skipped relevant Skoots.
4. Never auto-book, message, or share a student’s private data. The student manually selects **Book Breakdown** only if a current, creator-owned booking URL is configured.

## Student and Coach Experience

Students see a single actionable escalation card only when escalation is warranted. It names the reason, the right helper, and a safe booking link if one exists. The coach or CSM sees a short private notification and a pre-call brief. The brief includes only the assigned student’s goal, state, bottleneck, stated belief, prior Skoots and outcomes, relevant Pack knowledge, and the suggested focus for the conversation.

After a breakdown, the coach pastes notes or a transcript that they are authorized to process. Skootly offers two separate reviewable outputs: a client-next-Skoot suggestion and a Creator Pack knowledge proposal. Neither executes automatically.

## Content Skoot Privacy Boundary

Recurring bottleneck detection works only on anonymized assigned-student aggregates. It can suggest a private Creator Content Skoot such as a live walkthrough outline. It never contains a student’s name, exact conversation, recording, screenshot, or outcome evidence. Any identifiable storytelling needs a separate explicit consent record, which is out of scope for the MVP. Publishing is not included.

## Explicitly Deferred

This release excludes calendars, scheduling integrations, video capture, YouTube or social publishing, content editing, advanced analytics, marketplaces, billing, payouts, and multi-creator collaboration.
