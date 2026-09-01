import { describe, expect, it } from "vitest";
import { nextMascotPanelState } from "./mascotState";

describe("nextMascotPanelState", () => {
  it("restores a minimized mascot and opens its panel in the same tap", () => {
    expect(nextMascotPanelState(true, false)).toEqual({ minimized: false, panelOpen: true });
  });

  it("toggles an already visible mascot panel", () => {
    expect(nextMascotPanelState(false, true)).toEqual({ minimized: false, panelOpen: false });
  });
});
