# External Skoot Integration Paths

## ChatGPT private workspace app

OpenAI’s current documentation describes a private, organization-controlled path using a remote MCP server in ChatGPT developer mode. Workspace owners/admins add the server endpoint, select authentication, scan tools, test a draft app, and then publish it to their own workspace. OAuth support should issue refresh tokens for durable connections, and write actions should be confirmed by the user.

For Skootly, the first MCP surface should expose only tenant-scoped, read-only tools such as `get_current_skoot`, `list_active_skoots`, `get_recent_outcomes`, and `search_imported_learning_sources`. Write tools such as creating a check-in, completing a Skoot, or logging an outcome should be separate, explicitly named, and confirmation-gated.

This is a private workspace deployment path, not an automatic public ChatGPT directory listing. Public distribution has separate review and publication requirements.

## Manus integration direction

Manus supports OAuth2 Open Apps for third-party services acting on behalf of users. A Skootly integration should use OAuth rather than a shared API key for client data, expose narrowly scoped tools, and use the app’s own authorization layer to restrict every read and write to the signed-in Skootly user or an explicitly assigned coach relationship.

## Sources

1. [OpenAI — Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)
2. [Manus API Integration Guide](https://api.manus.ai)
