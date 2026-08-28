import type { Express } from "express";

const verificationPath = "/.well-known/openai-apps-challenge";

export function registerOpenAiDomainVerificationRoute(app: Express) {
  app.get(verificationPath, (_req, res) => {
    const challenge = process.env.OPENAI_APPS_DOMAIN_CHALLENGE?.trim();
    if (!challenge) return res.status(404).type("text/plain").send("Not found");
    return res.status(200).type("text/plain").send(challenge);
  });
}

export { verificationPath };
