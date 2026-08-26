# Conversational Skoot Prompt-to-Action Contract

## Purpose

The conversational Skoot turns a user request plus **authorized, user-supplied context** into one immediate next move. It does not inspect a platform, infer private administration routes, upload files, or make changes without explicit user confirmation.

## Allowed inputs

| Input | Example | Requirement |
| --- | --- | --- |
| User prompt | “Run the 5-Day Challenge Skoot Pack for my group.” | The user provides it in conversation. |
| Imported Skoot Pack | “5-Day Challenge” milestones and prerequisites | The user or creator has explicitly imported it. |
| Group context | `https://www.skool.com/my-group` | User-owned or user-authorized URL only. |
| Settings destination | `https://www.skool.com/my-group/about` or a saved template | User explicitly provides or approves it; Skootly never discovers it. |
| Lesson context | Imported transcript, caption, or homework | User is authorized to reuse the material. |

## Required output shape

```ts
type SkootPromptAction = {
  primaryAction: string;
  whyNow: string;
  actionType: "asset_preparation" | "platform_setup" | "homework" | "engagement" | "clarification";
  asset?: {
    deliverable: string;
    dimensions?: { width: number; height: number; unit: "px" };
    formatHints?: string[];
  };
  destination?: {
    label: string;
    url: string; // only an explicitly provided/approved HTTPS URL
    mode: "read_only_link" | "requires_confirmation";
  };
  sourceCitations: Array<{ title: string; sourceId: number }>;
  notToday: string[]; // max 3
};
```

## Example: 5-Day Challenge Skoot Pack

> **Your next move:** Create the 1084 × 576 pixel cover banner for your 5-Day Challenge.
>
> **Why now:** The challenge needs a clear promise before people encounter the group. Do not build the lesson sequence or invite members yet.
>
> **Then:** Open your saved [Group Settings → General] destination to replace the current cover. Skootly only opens the approved link; uploading the banner remains a user-confirmed step.

The action must cite the imported 5-Day Challenge Skoot Pack. If the pack does not specify a cover dimension or no settings URL has been supplied, Skoot asks exactly one clarifying question rather than inventing either value.

## External-action policy

Skootly exposes read-only links and instructions by default. Any future browser or MCP tool that can upload an asset, edit a group setting, post, comment, message, or trigger an automation must be separately named, narrowly scoped, and require an explicit user confirmation at the point of execution.
