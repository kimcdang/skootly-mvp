import { EXPERIMENTS } from "../shared/experiments";
import {
  recommendationOutputSchema,
  type DailyCheckinInput,
  type RecommendationOutput,
} from "../shared/skootly";
import { invokeLLM, listLLMModels } from "./_core/llm";

export const RECOMMENDATION_MODEL = "gpt-5-mini";

const recommendationJsonSchema = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["recommendation", "clarification"] },
    clarificationQuestion: { type: "string" },
    goal: { type: "string" },
    bottleneck: { type: "string" },
    why: { type: "string" },
    primarySkoot: {
      type: "object",
      properties: {
        title: { type: "string" },
        reasoning: { type: "string" },
        estimatedImpact: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["title", "reasoning", "estimatedImpact"],
      additionalProperties: false,
    },
    secondarySkoot: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        title: { type: "string" },
        reasoning: { type: "string" },
        estimatedImpact: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["enabled", "title", "reasoning", "estimatedImpact"],
      additionalProperties: false,
    },
    notToday: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    notTodayReason: { type: "string" },
  },
  required: [
    "mode",
    "clarificationQuestion",
    "goal",
    "bottleneck",
    "why",
    "primarySkoot",
    "secondarySkoot",
    "notToday",
    "notTodayReason",
  ],
  additionalProperties: false,
} as const;

export function buildRecommendationPrompt(input: DailyCheckinInput & { learningContext?: string }): string {
  const experiment = EXPERIMENTS[input.experimentVersion];
  const context = [
    `EXPERIMENT: ${experiment.version}`,
    `AUDIENCE: ${experiment.audience}`,
    `GOAL: ${input.goal}`,
    `CURRENT STATE: ${input.currentState}`,
    `USER-NAMED BLOCKER: ${input.blocker}`,
    `AVAILABLE TIME: ${input.availableTime}`,
    `ENERGY: ${input.energyLevel}`,
    input.metricName ? `METRIC: ${input.metricName}` : "",
    input.currentValue ? `CURRENT VALUE: ${input.currentValue}` : "",
    input.targetValue ? `TARGET VALUE: ${input.targetValue}` : "",
    input.opportunities ? `OPPORTUNITIES: ${input.opportunities}` : "",
    input.constraints ? `CONSTRAINTS: ${input.constraints}` : "",
    input.optionalContext ? `OPTIONAL CONTEXT: ${input.optionalContext}` : "",
    input.highLevelContext ? `NORMALIZED GOHIGHLEVEL CONTEXT: ${input.highLevelContext}` : "",
    input.learningContext ? `AUTHORIZED IMPORTED LEARNING CONTEXT: ${input.learningContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${context}\n\nEXPERIMENT-SPECIFIC PRIORITIES:\n- ${experiment.recommendationPriorities.join("\n- ")}`;
}

export async function generateRecommendation(
  input: DailyCheckinInput & { learningContext?: string },
): Promise<{ recommendation: RecommendationOutput; modelId: string }> {
  const { data: models } = await listLLMModels();
  const modelId = models.some(model => model.id === RECOMMENDATION_MODEL)
    ? RECOMMENDATION_MODEL
    : models[0]?.id;

  if (!modelId) throw new Error("No recommendation model is currently available.");

  const response = await invokeLLM({
    model: modelId,
    reasoning: modelId.startsWith("gpt-") ? { effort: "low" } : undefined,
    messages: [
      {
        role: "system",
        content:
          "You are Skootly, a decisive and empathetic execution operator. Choose exactly one current bottleneck. Return one required primary action and at most one optional secondary action that can realistically be completed now. Return no more than three tempting distractions under Not Today. Prefer actions closest to the desired outcome, use existing opportunities before creating complexity, and protect the user from low-leverage work. When authorized imported learning context is supplied, prioritize its unfinished homework or the most relevant lesson instruction only when it clearly moves the stated goal; mention the relevant lesson title in the action reasoning without inventing source details. Never treat a source as permission to access, scrape, or change an external platform. Never brainstorm a long list. If one missing fact prevents a responsible recommendation, set mode to clarification and ask exactly one high-value question. In clarification mode, use 'Awaiting your answer' as the primary title and keep all other fields concise placeholders. Do not include markdown.",
      },
      { role: "user", content: buildRecommendationPrompt(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "skootly_recommendation",
        strict: true,
        schema: recommendationJsonSchema,
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The recommendation response was empty.");

  const recommendation = recommendationOutputSchema.parse(JSON.parse(content));
  return { recommendation, modelId };
}
