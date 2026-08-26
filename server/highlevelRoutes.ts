import type { Express } from "express";
import { sdk } from "./_core/sdk";
import { completeHighLevelOAuth } from "./highlevelOAuth";

export function registerHighLevelOAuthRoutes(app: Express) {
  app.get("/api/integrations/highlevel/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) return res.redirect("/founder?highlevel=invalid_callback");
    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user) return res.redirect("/founder?highlevel=login_required");
    try {
      const result = await completeHighLevelOAuth(user.id, code, state);
      return res.redirect(`${result.returnPath}?highlevel=connected`);
    } catch (error) {
      console.error("[HighLevel OAuth] Callback failed:", error instanceof Error ? error.message : "Unknown error");
      return res.redirect("/founder?highlevel=connection_failed");
    }
  });
}
