import { describe, expect, it, vi } from "vitest";
import {
  createMascotNotification,
  shouldScheduleIdleReminder,
} from "../client/src/contexts/MascotContext";

describe("Skootly mascot state", () => {
  it("creates notifications with read, created, and dismissed metadata", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_777_000_000_000);
    const notice = createMascotNotification(
      "new_skoot",
      "Your next move is ready.",
      "Complete the warm-lead follow-up.",
    );
    expect(notice).toMatchObject({
      read: false,
      created_at: 1_777_000_000_000,
      dismissed_at: null,
      notification_type: "new_skoot",
    });
    vi.restoreAllMocks();
  });

  it("schedules the 25-minute idle timer only after the reminder cooldown", () => {
    const now = 1_777_000_000_000;
    expect(shouldScheduleIdleReminder({
      now,
      lastReminder: now - 21 * 60 * 60 * 1000,
      hasActiveSkoot: true,
      userPresent: true,
    })).toBe(true);
    expect(shouldScheduleIdleReminder({
      now,
      lastReminder: now - 2 * 60 * 60 * 1000,
      hasActiveSkoot: true,
      userPresent: true,
    })).toBe(false);
    expect(shouldScheduleIdleReminder({
      now,
      lastReminder: 0,
      hasActiveSkoot: false,
      userPresent: true,
    })).toBe(false);
  });
});
