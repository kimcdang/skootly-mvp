import { describe, expect, it } from "vitest";
import { buildImmutableCreatorPackVersion, resolveActiveApprovedVersion } from "./creatorPacks";

describe("Creator Pack lifecycle invariants", () => {
  it("creates a new version snapshot without mutating previously approved knowledge", () => {
    const prior = [{ knowledgeType: "principle" as const, content: "Protect the constraint", sourceText: "Original" }];
    const snapshot = buildImmutableCreatorPackVersion(3, prior, { knowledgeType: "decision_rule" as const, content: "Follow up before rebuilding", sourceText: "Call note" });

    expect(snapshot.versionNumber).toBe(4);
    expect(snapshot.carriedKnowledge).toEqual(prior);
    expect(snapshot.carriedKnowledge[0]).not.toBe(prior[0]);
    expect(prior).toEqual([{ knowledgeType: "principle", content: "Protect the constraint", sourceText: "Original" }]);
  });

  it("resolves only the Pack's explicitly active approved version", () => {
    const versions = [{ id: 7, versionNumber: 2 }, { id: 9, versionNumber: 3 }];
    expect(resolveActiveApprovedVersion(9, versions)).toEqual({ id: 9, versionNumber: 3 });
    expect(resolveActiveApprovedVersion(11, versions)).toBeNull();
    expect(resolveActiveApprovedVersion(null, versions)).toBeNull();
  });
});
