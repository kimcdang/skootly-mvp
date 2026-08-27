import { describe, expect, it } from "vitest";
import { normalizeShapedPackDraft } from "./packAuthoring";

describe("Pack authoring assist safeguards", () => {
  it("normalizes coach-reviewed drafts into an ordered, bounded Pack path", () => {
    const draft = normalizeShapedPackDraft("five_day_challenge", {
      name: "  My challenge ", description: " A short path ", destination: " A real result ", audience: " New coaches ", cadenceLabel: " 5 days ", notToday: "Do not add more modules.",
      milestones: [3, 2, 1].map(position => ({ position, title: ` Step ${position} `, definitionOfDone: " A visible result ", defaultSkoot: " Complete the one next move ", supportingSkoot: "", feedbackPrompt: " What happened? ", resourceUrl: position === 1 ? "javascript:alert(1)" : "https://example.com/resource", assetSpec: "", notToday: "" })),
    });
    expect(draft.name).toBe("My challenge");
    expect(draft.milestones.map(item => item.position)).toEqual([1, 2, 3]);
    expect(draft.milestones[0]?.resourceUrl).toBe("https://example.com/resource");
    expect(draft.milestones[2]?.resourceUrl).toBeUndefined();
    expect(draft.milestones.every(item => !item.supportingSkoot)).toBe(true);
  });

  it("rejects insufficient notes-to-draft output before it can be reviewed or published", () => {
    expect(() => normalizeShapedPackDraft("client_implementation", {
      name: "Client path", description: "", destination: "Done", audience: "Clients", cadenceLabel: "Weekly", notToday: "", milestones: [{ position: 1, title: "One", definitionOfDone: "Done", defaultSkoot: "Act", feedbackPrompt: "What happened?" }, { position: 2, title: "Two", definitionOfDone: "Done", defaultSkoot: "Act", feedbackPrompt: "What happened?" }],
    })).toThrow("at least three steps");
  });
});
