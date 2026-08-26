import { describe, expect, it, vi } from "vitest";
import {
  fetchHighLevelSnapshot,
  highLevelHeaders,
  highLevelFailureMessage,
  normalizeHighLevelSnapshot,
} from "./highlevel";

describe("GoHighLevel integration", () => {
  it("creates a server-side bearer header without changing the token", () => {
    expect(highLevelHeaders("pit-secret")).toMatchObject({
      Authorization: "Bearer pit-secret",
      Version: "v3",
    });
  });

  it("normalizes CRM records into counts and business signals without raw contacts", () => {
    const now = Date.UTC(2026, 7, 26);
    const snapshot = normalizeHighLevelSnapshot(
      { contacts: [{ id: "c1", name: "Private Name" }], meta: { total: 8 } },
      {
        opportunities: [
          { id: "o1", status: "open", monetaryValue: 2500, updatedAt: "2026-08-01T00:00:00.000Z" },
          { id: "o2", status: "won", monetaryValue: 9000, updatedAt: "2026-08-25T00:00:00.000Z" },
        ],
        total: 2,
      },
      { pipelines: [{ id: "p1", name: "Sales" }] },
      "location-1",
      now,
    );

    expect(snapshot).toMatchObject({
      contactCount: 8,
      opportunityCount: 2,
      openOpportunityCount: 1,
      totalOpenPipelineValue: 2500,
      staleOpportunityCount: 1,
      pipelineNames: ["Sales"],
    });
    expect(snapshot.summary).not.toContain("Private Name");
  });

  it("scopes every request to the configured location and returns a concise snapshot", async () => {
    const payloads = [
      { contacts: [], meta: { total: 4 } },
      { opportunities: [], total: 0 },
      { pipelines: [] },
    ];
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const snapshot = await fetchHighLevelSnapshot({
      token: "private-token",
      locationId: "loc 123",
      fetchImpl,
      now: 1_777_000_000_000,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("locationId=loc%20123");
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain("locationId=loc%20123");
    expect(fetchImpl.mock.calls[1]?.[1]?.body).toContain('"locationId":"loc 123"');
    expect(snapshot.contactCount).toBe(4);
  });

  it("fails safely when credentials are absent", async () => {
    await expect(fetchHighLevelSnapshot({ token: "", locationId: "" })).rejects.toThrow(
      "GoHighLevel is not configured",
    );
  });

  it("directs users to reconnect when an OAuth access token expired or was revoked", () => {
    expect(highLevelFailureMessage(401, "contacts")).toContain("Reconnect");
    expect(highLevelFailureMessage(401, "contacts")).not.toContain("token");
  });

  it("explains the missing read-only scope without exposing credentials", () => {
    expect(highLevelFailureMessage(403, "opportunities")).toContain("read-only scope");
    expect(highLevelFailureMessage(403, "opportunities")).toContain("Reconnect");
  });
});
