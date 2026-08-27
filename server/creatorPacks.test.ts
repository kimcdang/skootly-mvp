import { describe, expect, it } from "vitest";
import { deriveNextPackDiagnosticQuestion } from "./creatorPacks";

describe("Pack-aware Point A diagnostics", () => {
  const knowledge = [
    { id: 11, knowledgeType: "principle" as const, content: "Progress comes from fewer decisions." },
    { id: 12, knowledgeType: "milestone" as const, content: "Have you spoken with five prospective buyers?" },
    { id: 13, knowledgeType: "decision_rule" as const, content: "Confirm the offer before building the landing page." },
  ];

  it("asks one relevant Pack question at a time", () => {
    expect(deriveNextPackDiagnosticQuestion(knowledge, [])).toMatchObject({ key: "knowledge-12", text: "Have you spoken with five prospective buyers?" });
  });

  it("does not repeat an answer already stored for the student", () => {
    expect(deriveNextPackDiagnosticQuestion(knowledge, ["knowledge-12"])).toMatchObject({ key: "knowledge-13" });
  });

  it("stops asking when Pack diagnostic prompts are exhausted", () => {
    expect(deriveNextPackDiagnosticQuestion(knowledge, ["knowledge-12", "knowledge-13"])).toBeNull();
  });
});
