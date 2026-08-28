import express from "express";
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { registerOpenAiDomainVerificationRoute, verificationPath } from "./openaiDomainVerification";

describe("OpenAI domain challenge route", () => {
  const previousChallenge = process.env.OPENAI_APPS_DOMAIN_CHALLENGE;

  afterEach(() => {
    if (previousChallenge === undefined) delete process.env.OPENAI_APPS_DOMAIN_CHALLENGE;
    else process.env.OPENAI_APPS_DOMAIN_CHALLENGE = previousChallenge;
  });

  it("returns the configured challenge at only the required well-known endpoint", async () => {
    const configuredChallenge = process.env.OPENAI_APPS_DOMAIN_CHALLENGE;
    expect(configuredChallenge).toBeTruthy();
    const app = express();
    registerOpenAiDomainVerificationRoute(app);
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}${verificationPath}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(await response.text()).toBe(configuredChallenge?.trim());
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
