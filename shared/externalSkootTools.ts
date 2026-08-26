export const EXTERNAL_SKOOT_TOOLS = [
  {
    name: "get_current_skoot",
    access: "read" as const,
    description: "Read the caller’s current primary Skoot, bottleneck, and why-now rationale.",
  },
  {
    name: "resolve_skoot_prompt",
    access: "read" as const,
    description: "Turn a prompt and the caller’s private Skoot Packs into one grounded next action.",
  },
  {
    name: "get_learning_context",
    access: "read" as const,
    description: "Read only the caller’s enabled, manually imported learning-source titles and homework state.",
  },
  {
    name: "create_daily_checkin",
    access: "write" as const,
    requiresExplicitConfirmation: true,
    description: "Create a check-in only after the caller reviews and confirms the payload.",
  },
  {
    name: "complete_skoot",
    access: "write" as const,
    requiresExplicitConfirmation: true,
    description: "Mark a Skoot complete only after an explicit caller confirmation.",
  },
  {
    name: "report_skoot_outcome",
    access: "write" as const,
    requiresExplicitConfirmation: true,
    description: "Store an outcome only after the caller reviews and confirms it.",
  },
] as const;

export type ExternalSkootToolName = (typeof EXTERNAL_SKOOT_TOOLS)[number]["name"];

export function isExternalSkootWriteAllowed(toolName: ExternalSkootToolName, confirmed: boolean) {
  const tool = EXTERNAL_SKOOT_TOOLS.find(candidate => candidate.name === toolName);
  if (!tool) return false;
  return tool.access === "read" || confirmed === true;
}
