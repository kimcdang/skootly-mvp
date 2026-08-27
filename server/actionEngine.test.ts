import { describe, expect, it } from "vitest";
import { buildHighLevelActionSignals, generateNextActions, scoreActionSignal } from "./actionEngine";

describe("Freight to Freedom action engine", () => {
  it("scores urgency, revenue opportunity, and conversion likelihood deterministically", () => {
    expect(scoreActionSignal({ urgency: 3, estimatedValue: 24000, conversionLikelihood: 3 })).toBeGreaterThan(
      scoreActionSignal({ urgency: 1, estimatedValue: 500, conversionLikelihood: 1 }),
    );
  });

  it("returns no more than two actions in descending priority order", () => {
    const actions = generateNextActions([
      { kind: "follow_up_lead", title: "Low", description: "", signal: "", urgency: 1, estimatedValue: 0, conversionLikelihood: 1, contactIds: [], contactUrls: [] },
      { kind: "open_opportunity", title: "High", description: "", signal: "", urgency: 3, estimatedValue: 25000, conversionLikelihood: 3, contactIds: [], contactUrls: [] },
      { kind: "stale_opportunity", title: "Medium", description: "", signal: "", urgency: 2, estimatedValue: 7000, conversionLikelihood: 2, contactIds: [], contactUrls: [] },
      { kind: "webinar_lead", title: "Fourth", description: "", signal: "", urgency: 2, estimatedValue: 5000, conversionLikelihood: 1, contactIds: [], contactUrls: [] },
    ]);
    expect(actions).toHaveLength(2);
    expect(actions.map(action => action.title)).toEqual(["High", "Medium"]);
  });

  it("only treats explicitly tagged contacts as webinar leads and keeps contact context bounded", () => {
    const contacts = {
      contacts: [
        { id: "one", tags: ["webinar"] },
        { id: "two", tags: ["interested"] },
        ...Array.from({ length: 10 }, (_, index) => ({ id: `lead-${index}`, tags: ["webinar"] })),
      ],
    };
    const signals = buildHighLevelActionSignals(contacts, { opportunities: [] }, Date.now());
    const webinar = signals.find(signal => signal.kind === "webinar_lead");
    expect(webinar?.contactIds).toHaveLength(8);
    expect(webinar?.signal).toContain("11 contacts");
    expect(webinar?.contactIds).not.toContain("two");
  });
});
