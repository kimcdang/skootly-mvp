import { invokeLLM } from "./_core/llm";
import type { PackTemplateKind } from "./packMvp";

export type ShapedPackDraft = {
  templateKind: PackTemplateKind;
  name: string;
  description: string;
  destination: string;
  audience: string;
  cadenceLabel: string;
  notToday: string;
  milestones: Array<{
    position: number;
    title: string;
    definitionOfDone: string;
    defaultSkoot: string;
    supportingSkoot?: string;
    feedbackPrompt: string;
    resourceUrl?: string;
    assetSpec?: string;
    notToday?: string;
  }>;
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "destination", "audience", "cadenceLabel", "notToday", "milestones"],
  properties: {
    name: { type: "string" }, description: { type: "string" }, destination: { type: "string" }, audience: { type: "string" }, cadenceLabel: { type: "string" }, notToday: { type: "string" },
    milestones: { type: "array", minItems: 3, maxItems: 7, items: { type: "object", additionalProperties: false, required: ["position", "title", "definitionOfDone", "defaultSkoot", "feedbackPrompt", "supportingSkoot", "resourceUrl", "assetSpec", "notToday"], properties: { position: { type: "integer" }, title: { type: "string" }, definitionOfDone: { type: "string" }, defaultSkoot: { type: "string" }, supportingSkoot: { type: "string" }, feedbackPrompt: { type: "string" }, resourceUrl: { type: "string" }, assetSpec: { type: "string" }, notToday: { type: "string" } } } },
  },
} as const;

export function normalizeShapedPackDraft(templateKind: PackTemplateKind, candidate: Omit<ShapedPackDraft, "templateKind">): ShapedPackDraft {
  const milestones = candidate.milestones.slice(0, 7).map((item, index) => ({
    position: index + 1,
    title: item.title.trim(),
    definitionOfDone: item.definitionOfDone.trim(),
    defaultSkoot: item.defaultSkoot.trim(),
    supportingSkoot: item.supportingSkoot?.trim() || undefined,
    feedbackPrompt: item.feedbackPrompt.trim(),
    resourceUrl: /^https:\/\//i.test(item.resourceUrl || "") ? (item.resourceUrl || "").trim() : undefined,
    assetSpec: item.assetSpec?.trim() || undefined,
    notToday: item.notToday?.trim() || undefined,
  }));
  if (milestones.length < 3) throw new Error("Please add a little more detail so Skootly can shape at least three steps.");
  return { ...candidate, templateKind, name: candidate.name.trim(), description: candidate.description.trim(), destination: candidate.destination.trim(), audience: candidate.audience.trim(), cadenceLabel: candidate.cadenceLabel.trim(), notToday: candidate.notToday.trim(), milestones };
}

export async function shapePackFromNotes(input: { templateKind: PackTemplateKind; notes: string }): Promise<ShapedPackDraft> {
  const result = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 2200,
    reasoning: { effort: "minimal" },
    response_format: { type: "json_schema", json_schema: { name: "creator_pack_draft", strict: true, schema: responseSchema } },
    messages: [
      { role: "system", content: "You turn a coach's own non-sensitive method notes into an editable Skootly execution Pack. Return a practical 3–7 milestone path. Each milestone has exactly one clear primary Skoot and at most one supporting Skoot. Do not invent credentials, private URLs, client names, outcomes, medical/legal/financial claims, or facts not supplied. Keep actions concrete and brief. Use an empty string for optional fields you cannot ground. The output is only a draft for creator review; never claim it is published." },
      { role: "user", content: `Pack shape: ${input.templateKind}. Coach notes (use only these notes):\n${input.notes}` },
    ],
  });
  const content = result.choices[0]?.message.content;
  const text = typeof content === "string" ? content : "";
  if (!text) throw new Error("Skootly could not shape that draft. Please try again or begin from the template.");
  return normalizeShapedPackDraft(input.templateKind, JSON.parse(text) as Omit<ShapedPackDraft, "templateKind">);
}
