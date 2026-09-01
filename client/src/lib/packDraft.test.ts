import { describe, expect, it } from "vitest";
import { toUsableGuidedPackDraft } from "./packDraft";

const fallback = { templateKind: "five_day_challenge" as const, destination: "Launch a clear offer", audience: "New coaches" };
const validMilestone = (title: string) => ({ title, definitionOfDone: "A visible result", defaultSkoot: "Complete the decisive next move", feedbackPrompt: "What happened?" });

describe("toUsableGuidedPackDraft", () => {
  it("returns a review-safe, ordered draft and fills only optional fallbacks", () => {
    const draft = toUsableGuidedPackDraft({ name: "  Test Pack ", milestones: [validMilestone("Third"), validMilestone("Second"), validMilestone("First")] }, fallback);
    expect(draft?.name).toBe("Test Pack");
    expect(draft?.destination).toBe(fallback.destination);
    expect(draft?.milestones.map(item => item.position)).toEqual([1, 2, 3]);
  });

  it("rejects incomplete responses before they reach the interactive Pack editor", () => {
    expect(toUsableGuidedPackDraft({ name: "Broken", milestones: [{ title: "Only one" }] }, fallback)).toBeNull();
  });
});
