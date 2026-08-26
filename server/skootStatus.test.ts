import { describe, expect, it } from "vitest";
import { canTransitionSkootStatus } from "./db";

describe("Skoot action state transitions", () => {
  it("allows an active Skoot to be completed or skipped", () => {
    expect(canTransitionSkootStatus("active", "completed")).toBe(true);
    expect(canTransitionSkootStatus("active", "skipped")).toBe(true);
  });

  it("prevents completed or skipped Skoots from being changed again", () => {
    expect(canTransitionSkootStatus("completed", "skipped")).toBe(false);
    expect(canTransitionSkootStatus("completed", "completed")).toBe(false);
    expect(canTransitionSkootStatus("skipped", "completed")).toBe(false);
    expect(canTransitionSkootStatus("skipped", "skipped")).toBe(false);
  });
});
