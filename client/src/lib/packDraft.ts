import type { GuidedPackDraft } from "@/components/GuidedPackBuilder";

type TemplateKind = GuidedPackDraft["templateKind"];
type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord => typeof value === "object" && value !== null;
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

/**
 * The review screen must receive a complete, editable Pack draft. This keeps
 * an unexpected API response from becoming an opaque runtime error in a browser.
 */
export function toUsableGuidedPackDraft(
  value: unknown,
  fallback: { templateKind: TemplateKind; destination: string; audience: string },
): GuidedPackDraft | null {
  if (!isRecord(value) || !Array.isArray(value.milestones) || value.milestones.length < 3 || value.milestones.length > 7) return null;
  const templateKind = value.templateKind === "five_day_challenge" || value.templateKind === "client_implementation" ? value.templateKind : fallback.templateKind;
  const milestones: GuidedPackDraft["milestones"] = [];
  for (let index = 0; index < value.milestones.length; index += 1) {
    const item = value.milestones[index];
    if (!isRecord(item)) return null;
    const title = clean(item.title);
    const definitionOfDone = clean(item.definitionOfDone);
    const defaultSkoot = clean(item.defaultSkoot);
    const feedbackPrompt = clean(item.feedbackPrompt);
    if (!title || !definitionOfDone || !defaultSkoot || !feedbackPrompt) return null;
    milestones.push({
      position: index + 1,
      title,
      definitionOfDone,
      defaultSkoot,
      supportingSkoot: clean(item.supportingSkoot) || undefined,
      feedbackPrompt,
      resourceUrl: clean(item.resourceUrl) || undefined,
      assetSpec: clean(item.assetSpec) || undefined,
      notToday: clean(item.notToday) || undefined,
    });
  }

  return {
    templateKind,
    name: clean(value.name) || "My first Pack",
    description: clean(value.description) || undefined,
    destination: clean(value.destination) || fallback.destination,
    audience: clean(value.audience) || fallback.audience,
    cadenceLabel: clean(value.cadenceLabel) || "Step by step",
    notToday: clean(value.notToday) || undefined,
    milestones,
  };
}
