export const creatorKnowledgeTypes = [
  "principle", "framework", "diagnostic_rule", "decision_rule", "milestone", "skoot_action", "script", "not_today", "example",
] as const;

export type CreatorKnowledgeType = (typeof creatorKnowledgeTypes)[number];

export type PackDiagnosticQuestion = {
  key: string;
  text: string;
  options: string[];
  knowledgeId: number;
};

export function buildImmutableCreatorPackVersion<T extends object, U extends object>(latestVersionNumber: number, existingKnowledge: T[], addition: U) {
  return {
    versionNumber: latestVersionNumber + 1,
    carriedKnowledge: existingKnowledge.map(item => ({ ...item })),
    addition: { ...addition },
  };
}

export function resolveActiveApprovedVersion<T extends { id: number }>(activeVersionId: number | null, versions: T[]) {
  if (!activeVersionId) return null;
  return versions.find(version => version.id === activeVersionId) ?? null;
}

export function deriveNextPackDiagnosticQuestion(
  knowledge: Array<{ id: number; knowledgeType: CreatorKnowledgeType; content: string }>,
  answeredKeys: string[],
): PackDiagnosticQuestion | null {
  const candidate = knowledge.find(item =>
    ["milestone", "diagnostic_rule", "decision_rule"].includes(item.knowledgeType) &&
    !answeredKeys.includes(`knowledge-${item.id}`),
  );
  if (!candidate) return null;
  const firstLine = candidate.content.split("\n").map(line => line.trim()).find(Boolean) || candidate.content;
  const text = firstLine.includes("?")
    ? firstLine
    : `Are you currently ready for this step: ${firstLine.replace(/[.]+$/, "")}?`;
  return { key: `knowledge-${candidate.id}`, text, options: ["Yes", "Sort of", "No"], knowledgeId: candidate.id };
}

export function proposeCreatorKnowledge(sourceText: string, selectedType?: CreatorKnowledgeType) {
  const normalized = sourceText.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const proposedType = selectedType ?? (
    /don't|do not|not yet|avoid|before/.test(lower) ? "not_today" :
    /if\s|when\s|unless\s/.test(lower) ? "decision_rule" :
    /script|say this|template/.test(lower) ? "script" :
    /milestone|complete|finish/.test(lower) ? "milestone" :
    /framework|method/.test(lower) ? "framework" : "principle"
  );
  const proposedContent = proposedType === "decision_rule" || proposedType === "not_today"
    ? normalized.replace(/^i['’]ve learned that\s*/i, "").replace(/^students?\s+(should|shouldn't|should not)\s*/i, "")
    : normalized;
  return { proposedType, proposedContent: proposedContent.slice(0, 5000) };
}

export function buildCreatorPackContext(pack: { creatorName: string | null; packName: string; versionNumber: number; approvedAt: number }, knowledge: Array<{ id: number; knowledgeType: CreatorKnowledgeType; content: string }>) {
  return {
    label: `Powered by ${pack.creatorName || "your creator"}'s ${pack.packName} · Version ${pack.versionNumber}`,
    updatedAt: pack.approvedAt,
    context: knowledge.slice(0, 20).map(item => `[${item.knowledgeType}] ${item.content}`).join("\n"),
    knowledge,
  };
}
