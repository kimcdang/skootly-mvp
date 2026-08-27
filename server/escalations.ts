export type EscalationLevel = "csm" | "coach";

export function validateBookingUrl(value?: string | null) {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== "https:") throw new Error("Booking links must use HTTPS.");
  return url.toString();
}

export function chooseEscalation(input: { explicitlyRequestsHuman: boolean; repeatedAttempts: number; hasRelevantPackRule: boolean; strategyNeeded: boolean; hasCsm: boolean; hasCoach: boolean }) {
  if (!input.explicitlyRequestsHuman && input.hasRelevantPackRule && input.repeatedAttempts < 2 && !input.strategyNeeded) return null;
  if (!input.strategyNeeded && input.hasCsm) return { level: "csm" as const, reason: input.explicitlyRequestsHuman ? "The student requested human accountability or navigation support." : "The bottleneck persisted after execution and needs an accountability or navigation unblock." };
  if (input.hasCoach) return { level: "coach" as const, reason: input.strategyNeeded ? "This bottleneck needs the creator’s strategy or diagnosis." : "The student requested a live breakdown and no active CSM route is available." };
  return null;
}

export function anonymizedContentSuggestion(bottleneck: string, count: number) {
  return {
    title: `Teach the real bottleneck behind “${bottleneck}”`,
    format: "Live walkthrough / YouTube video",
    outline: [
      "What students commonly believe is blocking progress",
      "What the recurring pattern actually suggests",
      "How to diagnose the bottleneck with the relevant framework",
      "The one next action to prescribe",
      "What evidence to look for after execution",
    ].join("\n"),
    occurrenceCount: count,
  };
}
