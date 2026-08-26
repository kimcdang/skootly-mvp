import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_EVENT_NAMES,
  experimentEventInputSchema,
} from "../shared/skootly";

describe("Skootly validation event taxonomy", () => {
  it("contains every required validation event exactly once", () => {
    expect(new Set(EXPERIMENT_EVENT_NAMES)).toEqual(new Set([
      "landing_page_view",
      "onboarding_started",
      "onboarding_completed",
      "skoot_generated",
      "skoot_completed",
      "skoot_skipped",
      "outcome_reported",
      "signup_started",
      "signup_completed",
      "feedback_recorded",
    ]));
  });

  it("requires a non-empty experiment version for every event", () => {
    for (const eventName of EXPERIMENT_EVENT_NAMES) {
      expect(experimentEventInputSchema.safeParse({
        experimentVersion: "founder",
        eventName,
      }).success).toBe(true);
      expect(experimentEventInputSchema.safeParse({
        experimentVersion: "",
        eventName,
      }).success).toBe(false);
    }
  });
});
