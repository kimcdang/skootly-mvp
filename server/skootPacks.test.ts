import { describe, expect, it } from "vitest";
import { resolvePromptToPackAction, type PromptPack } from "./skootPacks";

const fiveDayPack: PromptPack = {
  id: 7,
  title: "5-Day Challenge Skoot Pack",
  triggerPhrases: ["run the 5 day challenge", "run the skoot package"],
  goal: "Launch a clear 5-Day Challenge group.",
  group: {
    name: "My 5-Day Challenge",
    groupUrl: "https://www.skool.com/my-5-day-challenge",
    settingsUrl: "https://www.skool.com/my-5-day-challenge/about",
    settingsLabel: "Open Group Settings → General",
  },
  steps: [{
    id: 4,
    position: 1,
    actionType: "asset_preparation",
    actionTitle: "Create the 1084 × 576 cover banner for your 5-Day Challenge.",
    rationale: "The group needs a clear promise before you invite members.",
    assetDeliverable: "Group cover banner",
    assetWidth: 1084,
    assetHeight: 576,
    assetFormatHints: JSON.stringify(["PNG", "JPG"]),
    requiresConfirmation: true,
  }],
};

describe("resolvePromptToPackAction", () => {
  it("returns one cover-banner next action with dimensions and only the user-provided settings link", () => {
    const result = resolvePromptToPackAction("Run the 5-Day Challenge Skoot Pack for my group.", [fiveDayPack]);
    expect(result.mode).toBe("action");
    if (result.mode !== "action") return;
    expect(result.primaryAction).toContain("1084 × 576");
    expect(result.asset?.dimensions).toEqual({ width: 1084, height: 576, unit: "px" });
    expect(result.destination?.url).toBe("https://www.skool.com/my-5-day-challenge/about");
    expect(result.confirmationRequired).toBe(true);
    expect(result.sourceCitations).toEqual([{ title: "5-Day Challenge Skoot Pack", sourceId: 7 }]);
  });

  it("asks one clarification when no imported pack matches", () => {
    expect(resolvePromptToPackAction("Help me start something", [fiveDayPack])).toEqual({
      mode: "clarification",
      question: "Which Skoot Pack should I run, or what outcome should your group have next?",
    });
  });

  it("returns the asset instruction but no external destination when the user did not provide a settings link", () => {
    const packWithoutSettings: PromptPack = {
      ...fiveDayPack,
      group: {
        ...fiveDayPack.group!,
        settingsUrl: null,
      },
    };
    const result = resolvePromptToPackAction("run the 5 day challenge", [packWithoutSettings]);
    expect(result.mode).toBe("action");
    if (result.mode !== "action") return;
    expect(result.asset?.deliverable).toBe("Group cover banner");
    expect(result.destination).toBeNull();
    expect(result.confirmationRequired).toBe(true);
  });
});
