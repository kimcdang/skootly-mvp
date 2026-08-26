# HighLevel Multi-Tenant Connection Design

Skootly must use HighLevel’s OAuth 2.0 Authorization Code Grant for production customer connections. A founder-owned Private Integration Token is suitable only for founder testing because it is one static account credential and cannot safely represent whichever Skootly user is signed in.

The HighLevel Marketplace app should target sub-accounts/locations and request `contacts.readonly`, `opportunities.readonly`, and `oauth.write` for the initial validation release. The write scope is used only for an explicit user disconnect through HighLevel’s official app-uninstall endpoint. After installation, HighLevel redirects to Skootly with an authorization code. Skootly exchanges that code at `POST https://services.leadconnectorhq.com/oauth/token` using `application/x-www-form-urlencoded` fields for `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, `user_type`, and `redirect_uri`.

The token response includes `access_token`, `refresh_token`, `expires_in`, granted `scope`, `userType`, `locationId` for location tokens, `companyId`, and the installing HighLevel `userId`. Access tokens last approximately 24 hours. Refresh tokens last up to one year if unused but rotate on use, so every successful refresh must atomically replace both encrypted tokens.

Skootly will validate an opaque, single-use OAuth state value tied to the authenticated Skootly user before exchanging a code. The resulting connection row will be owned by that Skootly user and selected HighLevel location. Tokens must be encrypted at rest with a server-only key, never returned through tRPC, and redacted from logs and error messages. All snapshot reads, refreshes, selections, and disconnects must query by both `userId` and connection ID.

Disconnect calls `DELETE /marketplace/app/:appId/installations` with the selected location’s OAuth token, location ID, and an audit reason. The endpoint requires `oauth.write`. Skootly deletes the encrypted local connection only after HighLevel confirms `success: true`.

## Sources

1. [HighLevel OAuth 2.0](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/)
2. [HighLevel Get Access Token](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-access-token/)
3. [HighLevel Uninstall an Application](https://marketplace.gohighlevel.com/docs/ghl/marketplace/uninstall-application/)
