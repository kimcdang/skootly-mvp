import { describe, expect, it } from "vitest";
import { anonymizedContentSuggestion, chooseEscalation, validateBookingUrl } from "./escalations";

describe("Smart Escalation routing", () => {
  it("keeps a student in self-serve Pack guidance when a relevant rule can still help", () => {
    expect(chooseEscalation({ explicitlyRequestsHuman: false, repeatedAttempts: 0, hasRelevantPackRule: true, strategyNeeded: false, hasCsm: true, hasCoach: true })).toBeNull();
  });

  it("routes human accountability needs to an available CSM before the coach", () => {
    expect(chooseEscalation({ explicitlyRequestsHuman: true, repeatedAttempts: 0, hasRelevantPackRule: true, strategyNeeded: false, hasCsm: true, hasCoach: true })).toMatchObject({ level: "csm" });
  });

  it("routes explicit strategy needs to the coach", () => {
    expect(chooseEscalation({ explicitlyRequestsHuman: true, repeatedAttempts: 1, hasRelevantPackRule: true, strategyNeeded: true, hasCsm: true, hasCoach: true })).toMatchObject({ level: "coach" });
  });

  it("only accepts HTTPS booking links", () => {
    expect(validateBookingUrl("https://calendar.example.com/book")).toBe("https://calendar.example.com/book");
    expect(() => validateBookingUrl("http://calendar.example.com/book")).toThrow("HTTPS");
  });

  it("redacts common identifiers before creating a private Content Skoot", () => {
    const suggestion = anonymizedContentSuggestion("Email Jamie at jamie@example.com or open https://private.example.com/client/7", 3);
    expect(suggestion.title).not.toContain("jamie@example.com");
    expect(suggestion.title).not.toContain("https://private.example.com");
    expect(suggestion.safePattern).toContain("[email removed]");
    expect(suggestion.safePattern).toContain("[link removed]");
  });
});
