export type PromptPack = {
  id: number;
  title: string;
  triggerPhrases: string[];
  goal: string;
  group: { name: string; groupUrl: string; settingsUrl: string | null; settingsLabel: string | null } | null;
  steps: Array<{
    id: number;
    position: number;
    actionType: "asset_preparation" | "platform_setup" | "homework" | "engagement";
    actionTitle: string;
    rationale: string;
    assetDeliverable: string | null;
    assetWidth: number | null;
    assetHeight: number | null;
    assetFormatHints: string | null;
    requiresConfirmation: boolean;
  }>;
};

function scoreMatch(prompt: string, pack: PromptPack) {
  const normalized = prompt.toLocaleLowerCase();
  const candidates = [pack.title, ...pack.triggerPhrases].map(value => value.toLocaleLowerCase());
  return candidates.reduce((score, phrase) => score + (normalized.includes(phrase) ? phrase.length : 0), 0);
}

export function resolvePromptToPackAction(prompt: string, packs: PromptPack[]) {
  const ranked = packs
    .map(pack => ({ pack, score: scoreMatch(prompt, pack) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.pack.title.localeCompare(b.pack.title));
  const match = ranked[0]?.pack;
  if (!match) {
    return {
      mode: "clarification" as const,
      question: "Which Skoot Pack should I run, or what outcome should your group have next?",
    };
  }
  const step = [...match.steps].sort((a, b) => a.position - b.position)[0];
  if (!step) {
    return {
      mode: "clarification" as const,
      question: `“${match.title}” is missing its first step. What should the group complete first?`,
    };
  }
  const destination = match.group?.settingsUrl
    ? {
        label: match.group.settingsLabel || `Open ${match.group.name} settings`,
        url: match.group.settingsUrl,
        mode: "requires_confirmation" as const,
      }
    : null;
  return {
    mode: "action" as const,
    packId: match.id,
    packTitle: match.title,
    goal: match.goal,
    primaryAction: step.actionTitle,
    whyNow: step.rationale,
    actionType: step.actionType,
    asset: step.assetDeliverable
      ? {
          deliverable: step.assetDeliverable,
          dimensions:
            step.assetWidth && step.assetHeight
              ? { width: step.assetWidth, height: step.assetHeight, unit: "px" as const }
              : null,
          formatHints: step.assetFormatHints ? (JSON.parse(step.assetFormatHints) as string[]) : [],
        }
      : null,
    destination,
    sourceCitations: [{ title: match.title, sourceId: match.id }],
    confirmationRequired: Boolean(step.requiresConfirmation || destination),
  };
}
