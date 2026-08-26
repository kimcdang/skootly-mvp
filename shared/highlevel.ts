import { z } from "zod";

export const highLevelSnapshotSchema = z.object({
  locationId: z.string(),
  capturedAt: z.number(),
  contactCount: z.number().int().nonnegative(),
  opportunityCount: z.number().int().nonnegative(),
  openOpportunityCount: z.number().int().nonnegative(),
  totalOpenPipelineValue: z.number().nonnegative(),
  staleOpportunityCount: z.number().int().nonnegative(),
  pipelineNames: z.array(z.string()).max(20),
  taskCount: z.number().int().nonnegative().optional(),
  overdueTaskCount: z.number().int().nonnegative().optional(),
  summary: z.string().max(6000),
});

export type HighLevelSnapshot = z.infer<typeof highLevelSnapshotSchema>;

export function buildHighLevelSummary(snapshot: Omit<HighLevelSnapshot, "summary">): string {
  const pipelineLabel = snapshot.pipelineNames.length
    ? snapshot.pipelineNames.join(", ")
    : "No named pipelines returned";

  return [
    `GoHighLevel snapshot captured ${new Date(snapshot.capturedAt).toISOString()}.`,
    `Contacts: ${snapshot.contactCount}.`,
    `Opportunities: ${snapshot.opportunityCount} total, ${snapshot.openOpportunityCount} open, ${snapshot.staleOpportunityCount} stale.`,
    `Open pipeline value: ${snapshot.totalOpenPipelineValue.toFixed(2)}.`,
    `Pipelines: ${pipelineLabel}.`,
    snapshot.taskCount === undefined
      ? "Tasks were not included in this snapshot."
      : `Tasks: ${snapshot.taskCount}, including ${snapshot.overdueTaskCount ?? 0} overdue.`,
  ].join(" ");
}
