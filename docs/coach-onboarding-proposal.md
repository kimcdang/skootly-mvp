# Skootly Coach Onboarding Proposal

## Purpose

This proposal describes the **next Coach/Creator onboarding flow for the existing Skootly.com app**. It is intentionally written as an **approval-first product plan**, not an implementation record. The goal is to make a coach feel that Skootly can quickly turn their method into a usable execution system for clients **without asking them to “download their whole brain” into a complicated dashboard**.

The uploaded adjustments document points toward a fast setup experience with four repeated themes: the coach should first identify themselves, then provide the raw material that represents their method, then watch Skootly shape that material into a usable AI-guided flow, and finally control who can access it and whether access continues over time.

## What the uploaded document is asking for

The PDF suggests a coach-first onboarding model with the following intent:

| Theme from the document | What it means in Skootly terms |
| --- | --- |
| “Tell us about yourself” | Start with role-specific onboarding for a Coach/Creator rather than a generic sign-up path. |
| Add handles or URLs so Skootly “scrapes” to train the clone | The coach wants Skootly to absorb their method from existing materials, but this should be implemented only through **user-authorized, policy-safe inputs** rather than scraping third-party systems. |
| “Build AI clone” / “Your clone is ready” | Skootly should make the coach feel that their methodology has been converted into a reusable operating system, not just stored as notes. |
| Upload a file and create an asset / mini-app | Skootly should turn method material into actionable tools, Pack milestones, prompts, and next-step guidance. |
| Habit facilitation and feedback | The system should not just answer questions; it should move students toward execution with structured check-ins and completion feedback. |
| Student/client view simulation | The coach should preview what a student will actually experience before approval. |
| Users area, invite users, revoke access | The coach needs lightweight access control, invitation, and removal flows. |

## Recommended product direction

The right MVP interpretation is **not** “build a giant AI clone builder.” The right MVP is to make a coach feel that Skootly can take what they already teach and turn it into a **guided Pack with clear next actions, progress structure, and client access control**.

The best framing is:

> **Skootly helps a coach turn their method into a guided execution Pack that students can follow step by step.**

That means onboarding should end with one concrete outcome:

> The coach has a usable first Pack, has previewed the student experience, and can invite the first student.

## Proposed Coach onboarding sequence

### 1. Role selection at sign-up

After account creation, Skootly should ask one early branching question:

| Choice | Outcome |
| --- | --- |
| I’m here as a Coach / Creator | Route into Coach onboarding. |
| I’m joining a coach’s Pack | Route into student enrollment or creator invitation acceptance. |

This keeps the sign-up path calm and prevents coaches from landing inside a student-oriented workspace.

### 2. “Tell us about your coaching” starter screen

This screen should feel close to the reference you uploaded, but adapted to Skootly’s warm, simple brand. It should ask only for what is needed to personalize the first Pack:

| Field | Why it belongs |
| --- | --- |
| Coach or business name | Identity inside the workspace and student-facing preview. |
| Optional avatar/logo | Light brand personalization. |
| What do you help people achieve? | Defines the destination. |
| Who is this for? | Defines audience and tone. |
| What kind of experience are you creating first? | Template choice: 5-Day Challenge, Client Implementation, or Custom. |

This screen should **not** ask for integrations, CRM setup, team users, or HighLevel during the first-run flow.

### 3. “Bring your method in” screen

This is the most important change. Instead of asking the coach to manually build a Pack from scratch, Skootly should offer three compliant ways to bring in method material:

| Input mode | MVP behavior |
| --- | --- |
| Paste notes | Coach pastes how they currently teach the process. |
| Upload file | Coach uploads a PDF, worksheet, SOP, or challenge outline. |
| Start from template | Coach chooses 5-Day Challenge or Client Implementation and answers guided prompts. |

Important boundary: the uploaded document mentions adding handles or URLs so Skootly can scrape them. For the MVP, this should become **coach-provided URLs or uploaded materials used only when the coach has rights to the material and explicitly submits it**. Skootly should not silently crawl or scrape third-party platforms as part of onboarding.

### 4. “Shape my Pack” build step

Skootly already has the beginning of this. The onboarding version should make it the center of the experience.

The coach submits notes or files, then Skootly creates an editable draft with:

| Draft output | Required for v1 |
| --- | --- |
| Pack name | Yes |
| Destination | Yes |
| Audience | Yes |
| 3–7 milestones | Yes |
| One primary Skoot per milestone | Yes |
| Optional supporting Skoot per milestone | Yes |
| Definition of done | Yes |
| Feedback prompt | Yes |
| Not Today boundary | Yes |
| Optional resource link / asset spec | Yes |

This is where the coach should feel, “Skootly turned my method into a working system.”

### 5. “Tighten the Pack” review step

Before approval, Skootly should show a short checklist of only the decisions that matter:

| Review question | Why it matters |
| --- | --- |
| Is the destination correct? | Keeps the Pack outcome-oriented. |
| Are the milestones in the right order? | Preserves the coach’s logic. |
| Is each primary Skoot specific enough to act on? | Prevents vague advice. |
| Does each milestone define done clearly? | Enables feedback and progress. |
| What should students *not* focus on yet? | Protects the “Not Today” principle. |

This should not look like a complex editor. It should feel like approving a draft someone already prepared well.

### 6. Student-view preview before approval

This already exists conceptually and should become part of onboarding, not a hidden extra. The coach should be able to preview:

| Student preview element | Why it belongs |
| --- | --- |
| Destination | Lets coach verify the promised outcome. |
| Milestone rail | Shows the journey shape. |
| Current primary Skoot | Confirms the guidance is decisive. |
| Optional support action | Confirms the two-action cap. |
| Definition of done | Confirms execution clarity. |
| Feedback choices | Confirms the loop is built in. |
| Not Today boundary | Confirms restraint. |

This is the moment where the coach sees the “mini-app” idea come to life, but in Skootly’s opinionated execution format rather than a generic chatbot wrapper.

### 7. Approve first version

Once approved, Skootly should create the immutable first Pack version and move the coach to a launch screen. The coach should not have to wonder what to do next.

### 8. Coach launch screen

Instead of dumping the coach into a large workspace, show one focused launch sequence:

| Step | CTA |
| --- | --- |
| 1 | Shape or refine your Pack |
| 2 | Preview the student experience |
| 3 | Approve version 1 |
| 4 | Invite your first student |

This should remain visible until the coach has completed the sequence.

### 9. Invite and access management

The document’s later pages clearly want user access control. The current direction should become:

| Need | MVP behavior |
| --- | --- |
| Invite students | Secure, single-use enrollment links tied to email and Pack version. |
| Invite creators | Separate creator-workspace invitation, no shared student or Pack access by default. |
| Remove access | Coach can deactivate or revoke future access. |
| If client leaves program | Access ends. |
| If client stays | Access continues under the assigned Pack/version. |

For this phase, “Users” should mean lightweight access control and status visibility, not a full CRM.

## Proposed scope for the next build

### What should be added now

| Priority | Change |
| --- | --- |
| P0 | Role-based Coach onboarding entry after sign-up |
| P0 | Coach identity + offer/outcome capture screen |
| P0 | Method input step with paste/upload/template choices |
| P0 | Onboarding-specific Shape my Pack draft generation |
| P0 | Short review checklist before approval |
| P0 | Student-view preview inside onboarding |
| P0 | Launch screen with only the next four actions |
| P1 | Basic Users area language cleanup so invites/access feel coach-native |
| P1 | Small “access removed / invite expired” states for clarity |

### What should be deferred

| Defer for later | Reason |
| --- | --- |
| Automatic scraping of third-party course platforms | Too risky from a permissions and policy standpoint unless formally authorized. |
| Full AI clone branding | Too vague for MVP and risks becoming a generic chatbot promise. |
| HighLevel during onboarding | Adds friction before first value. |
| Team/CSM setup during onboarding | Not necessary for first coach success. |
| Advanced analytics dashboards | Would distract from launch readiness. |
| Publishing mini-apps everywhere | Better after Pack adoption and execution loop are proven. |

## Data and privacy boundaries

The proposal should preserve the following product constraints:

| Boundary | Proposed rule |
| --- | --- |
| Coach material ingestion | Use only pasted, uploaded, or explicitly submitted coach-owned material. |
| Student privacy | No exposure of student private conversations in onboarding. |
| Pack changes | Student guidance changes only after creator approval of a version. |
| External writes | Never automatic during onboarding. |
| Access control | Invitations remain email-bound and revocable. |

## The recommended first-session success metric

Coach onboarding is successful if, in one sitting, the coach can do all of the following:

| Success checkpoint | Must happen in first session |
| --- | --- |
| Define who the Pack is for | Yes |
| Submit raw method material | Yes |
| Review a shaped Pack draft | Yes |
| Preview the student experience | Yes |
| Approve version 1 | Yes |
| Copy the first student invite | Yes |

If the onboarding asks for more than this, it will feel like work rather than acceleration.

## Recommended build order

| Slice | What changes |
| --- | --- |
| Slice 1 | Add Coach/Student branching after sign-up and a Coach onboarding shell. |
| Slice 2 | Add the “Tell us about your coaching” and “Bring your method in” steps. |
| Slice 3 | Connect onboarding inputs to Shape my Pack draft generation. |
| Slice 4 | Add review checklist and student-view preview. |
| Slice 5 | Route approved coaches into the existing launch sequence and invitation flow. |
| Slice 6 | Refine Users/access wording and expired/removed-access states. |

## Recommendation

The strongest next move is to implement a **Coach onboarding flow that ends in an approved Pack and a first student invite**, not a broad AI-clone builder. The uploaded document is directionally right about speed, ownership, and turning knowledge into execution. Skootly should interpret that vision through its own advantage:

> **One clear Pack, one current next action, one feedback loop, and owned client access.**

If approved, this onboarding would make Skootly feel less like a blank dashboard and more like a coach’s fastest path from knowledge to client execution.
