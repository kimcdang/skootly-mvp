import { describe, expect, it } from "vitest";
import { createInviteToken, hashInviteToken, isInviteExpired, starterPackDraft, validatePackBlueprintDraft } from "./packMvp";

describe("Creator Pack MVP primitives", () => {
  it("provides a bounded five-day challenge scaffold with one primary action per milestone", () => {
    const draft = starterPackDraft("five_day_challenge");
    expect(draft.milestones).toHaveLength(5);
    expect(draft.milestones.every(item => Boolean(item.defaultSkoot))).toBe(true);
    expect(draft.milestones[0]?.assetSpec).toContain("1084 × 576");
    expect(() => validatePackBlueprintDraft(draft)).not.toThrow();
  });

  it("rejects a Pack path outside the three-to-seven milestone limit", () => {
    const draft = starterPackDraft("client_implementation");
    expect(() => validatePackBlueprintDraft({ ...draft, milestones: draft.milestones.slice(0, 2) })).toThrow("three to seven");
  });

  it("uses a high-entropy opaque token and persists only its fixed hash", () => {
    const token = createInviteToken();
    const hash = hashInviteToken(token);
    expect(token).toHaveLength(43);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(isInviteExpired(100, 100)).toBe(true);
    expect(isInviteExpired(101, 100)).toBe(false);
  });
});
