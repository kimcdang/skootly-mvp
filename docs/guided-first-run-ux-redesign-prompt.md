# Manus Agent Prompt — Guided First-Run UX Redesign for Skootly

Update the **existing Skootly app**. Do not rebuild it from scratch, replace its working back end, alter its data model, or redesign its established running-S visual identity. Keep the warm cream background, bold black typography, Memphis accents, rounded cards, existing navigation, mascot, learning sources, Skoot Packs, HighLevel connections, Freight to Freedom workspace, and private Skoot conversation. This is a **hierarchy and onboarding-flow redesign**, not a feature expansion.

## Goal

Make the first authenticated experience immediately intuitive. A user should understand what to do in under five seconds and should never have to choose between multiple product concepts before Skootly has helped them make progress.

The governing principle remains:

> **Goal → bottleneck → one primary Skoot + one optional supporting Skoot → outcome → next bottleneck.**

Skootly should lead with the user’s desired outcome and then diagnose the bottleneck. It should not lead with a generic prompt box, a chat panel, Skoot Pack configuration, learning import, CRM connection, or advanced product vocabulary.

## Current UX Problem to Solve

The current authenticated workspace puts multiple equal-weight surfaces near the top: **Talk to Skoot**, an open prompt composer, an “Add or tailor a Skoot Pack” link, a clarification card, and a private conversation panel. This makes a first-time user decide how Skootly works before receiving a useful decision.

Replace this with a single, calm guided path. Advanced tools should become visible only when they are relevant.

## Required First-Run Flow

For a signed-in user with **no active recommendation**, show a dedicated guided check-in in the primary workspace area. Do not display the full prompt composer or chat panel above it.

### Step 1 — Name the outcome

Show this heading:

> **Good morning. Let’s find your next move.**

Show the first question prominently:

> **1. What outcome matters most today?**

Provide one large text field with a helpful placeholder such as:

> “For example: fill my challenge, close two sales calls, finish my lesson plan, or unblock a client.”

Include a short, quiet helper line: “One outcome is enough.”

### Step 2 — Find the constraint

After the user provides an outcome, show:

> **2. What is getting in the way?**

Offer quick-select options appropriate to the current experiment, plus **Something else**. For Founder/Freight contexts, example chips may include **Not enough leads**, **Need to follow up**, **Unclear offer**, **Too many priorities**, and **Need expert help**. For Coach and Client Success contexts, keep the wording audience-appropriate.

Always include a small optional text field for the user’s own words. Preserve the existing current-state, time, energy, metrics, opportunity, and constraint data fields, but place them behind a lightweight **Add useful context** disclosure. Do not force a long form before Skootly can provide a first answer.

### Step 3 — Get the next move

Show a clear final step state:

> **3. Get your next move**

Use a single dominant submit button such as **Find my next Skoot**. Reuse the existing protected recommendation generation flow and structured output. Do not introduce a new model endpoint or duplicate check-in persistence.

If the existing engine needs one missing fact, show exactly one inline clarification question in this same guided card. Preserve entered answers and do not send the user into a chat view.

## Returning-User Flow

For a signed-in user who already has active Skoots, bypass the guided check-in. The first visible element should be the existing focus view, with a stronger hierarchy:

1. A short greeting and current goal.
2. A dominant card labeled **Your Next Skoot**.
3. One clear primary action, rationale, expected impact, and **Done**, **Need help**, and **Not today** controls.
4. An optional supporting action only when it exists.
5. A small **Not today** section below the active action—not equal in visual weight.

Do not show two task cards as equal priorities. The optional action must be visually subordinate to the primary action.

## Where Existing Advanced Tools Belong

Keep all current capabilities, but lower their visual priority.

| Existing capability | Redesigned placement |
| --- | --- |
| Private Skoot conversation | A collapsed or secondary section below the active Skoot labeled **Want to talk it through?** It should not be an equal-weight starting surface. |
| Skoot Prompt / conversational action composer | Put behind **Ask Skoot something specific** after the guided flow or beneath the primary action. |
| Creator Skoot Pack provenance | When a Pack informs a result, show a quiet attribution line: **Powered by [Creator]’s [Pack] · Updated [date]**. Do not ask first-time students to choose a Pack. |
| Personal Skoot Packs | Put under **More ways to guide Skootly** or a contextual link only after the user receives an initial next move. |
| Manual lesson import | Put under a secondary **Add learning context** section. It must never block the core flow. |
| HighLevel connection | Show a compact optional context card only in relevant Founder/Freight spaces. Never make CRM setup the primary task. |
| Smart escalation / Book Breakdown | Show only when the shared routing logic determines human help is appropriate. |

## Navigation and Copy

Keep the current top navigation simple. **Today** should always return to the guided flow or active Skoot. **Momentum**, **Creator**, **Lab**, and specialist workspaces should remain accessible but not distract from the default user journey.

Avoid unexplained product terms in primary onboarding. A new user does not need to understand “Skoot Pack,” “Creator Mode,” “learning context,” “prompt composer,” or “AI conversation” before receiving their first action.

Use short, decisive language throughout:

> **Do less. Move forward.**

> **One clear move is enough for now.**

> **You do not need to solve everything today.**

## Visual and Interaction Requirements

Preserve the existing branded design system. Add a simple numbered step indicator with three labeled steps. It should feel friendly and calm—not like an enterprise onboarding wizard. Use the mascot as a light companion near the guided flow, but it must never obscure the text field, CTA, mobile controls, or primary action card.

On mobile, keep the active step and primary button within the first screen whenever possible. The flow should use a single vertical column with no horizontal scrolling. Use existing motion conventions: quick, subtle transitions; no bouncing or large animated changes; respect reduced-motion settings.

## Engineering Constraints

1. Reuse existing `dailyCheckin` input and recommendation logic. Do not create a second onboarding or recommendation system.
2. Preserve existing protected routes, user isolation, outcome tracking, source citations, Skoot Pack attribution, HighLevel handling, and action caps.
3. Do not change existing Creator, Freight to Freedom, Smart Escalation, or admin functionality except to improve their entry-point hierarchy where necessary.
4. Do not remove user-entered fields; move less essential details into progressive disclosure.
5. Maintain loading, empty, error, and authenticated states.
6. Add or update Vitest coverage for first-run versus returning-user display logic, guided field progression, one-clarification handling, and primary-versus-secondary action hierarchy.
7. Run TypeScript checks, full tests, production build, and desktop/mobile visual verification before delivery.

## Acceptance Criteria

The redesign is complete when:

- A first-time signed-in user sees a clear **Step 1** before any chat, Pack, or integration setup.
- The path is visibly **Outcome → bottleneck → next move**.
- A user can generate a recommendation without filling a large form.
- A returning user sees one dominant active Skoot immediately.
- The private conversation, Pack, lesson import, CRM connection, and escalation options remain available but never compete with the initial decision.
- The interface still supports the existing one-primary-plus-one-optional-action rule.
- No existing security boundary, tenant isolation rule, or explicit-confirmation requirement is weakened.

Deliver the redesign as an incremental, tested update to the existing Skootly project. Do not make unrelated changes.
