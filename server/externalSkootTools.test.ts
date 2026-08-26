import { describe, expect, it } from "vitest";
import { EXTERNAL_SKOOT_TOOLS, isExternalSkootWriteAllowed } from "../shared/externalSkootTools";

describe("external Skoot tool contract", () => {
  it("keeps context and prompt resolution read-only", () => {
    expect(EXTERNAL_SKOOT_TOOLS.filter(tool => tool.access === "read").map(tool => tool.name)).toEqual([
      "get_current_skoot",
      "resolve_skoot_prompt",
      "get_learning_context",
    ]);
    expect(isExternalSkootWriteAllowed("resolve_skoot_prompt", false)).toBe(true);
  });

  it("rejects external writes unless the caller explicitly confirms", () => {
    expect(isExternalSkootWriteAllowed("create_daily_checkin", false)).toBe(false);
    expect(isExternalSkootWriteAllowed("complete_skoot", false)).toBe(false);
    expect(isExternalSkootWriteAllowed("report_skoot_outcome", true)).toBe(true);
  });
});
