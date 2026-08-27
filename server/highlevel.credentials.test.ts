import { describe, expect, it } from "vitest";
import { highLevelHeaders } from "./highlevel";

describe("GoHighLevel supplied credentials", () => {
  const liveIt = process.env.RUN_LIVE_GHL_TESTS === "true" ? it : it.skip;
  liveIt(
    "authenticates a lightweight read-only pipelines request for the configured location",
    async () => {
      const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
      const locationId = process.env.GHL_LOCATION_ID;

      expect(token, "GHL_PRIVATE_INTEGRATION_TOKEN must be configured").toBeTruthy();
      expect(locationId, "GHL_LOCATION_ID must be configured").toBeTruthy();

      const response = await fetch(
        `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${encodeURIComponent(locationId!)}`,
        { headers: highLevelHeaders(token!) },
      );

      const responseText = await response.text();
      expect(
        response.ok,
        `HighLevel credential validation failed with status ${response.status}: ${responseText.slice(0, 180)}`,
      ).toBe(true);
    },
    20_000,
  );
});
