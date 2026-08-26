import { describe, expect, it } from "vitest";
import { buildLearningContext, parseHomeworkItems, sanitizeLearningText } from "./learning";

describe("manual learning context", () => {
  it("removes scripts, markup, control characters, and excess whitespace before storage", () => {
    expect(sanitizeLearningText(" <script>bad()</script><b>Build</b>\u0000  the\n\n\nchallenge ", 100)).toBe("Build the\n\nchallenge");
  });

  it("extracts concise homework items from user-supplied action prompts", () => {
    expect(parseHomeworkItems("- Create the cover banner\n2. Update the group description\n\n• Invite warm leads")).toEqual([
      { title: "Create the cover banner", details: null, engagementType: "complete_homework" },
      { title: "Update the group description", details: null, engagementType: "complete_homework" },
      { title: "Invite warm leads", details: null, engagementType: "complete_homework" },
    ]);
  });

  it("keeps source context bounded and names the imported lesson", () => {
    const context = buildLearningContext([{ title: "5-Day Challenge", communityName: "Group Lab", lessonUrl: "https://www.skool.com/example", transcript: "Plan the promise.", homework: "Create a cover banner." }]);
    expect(context).toContain("Source: 5-Day Challenge — Group Lab");
    expect(context).toContain("Homework: Create a cover banner.");
    expect(context.length).toBeLessThanOrEqual(6000);
  });
});
