# Manual Slack setup

Use this only when Vercel Connect is unavailable.

## Slack app

Create a Slack app with:

- Bot scopes: `app_mentions:read`, `chat:write`, `im:history`, `files:read`.
- Event subscriptions: `app_mention`, `message.im`.
- Request URL: `https://<production-domain>/eve/v1/slack`.
- Interactivity & Shortcuts request URL: the same `/eve/v1/slack` URL.

Install the app to the workspace and set these production environment variables:

```text
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

Do not set `SLACK_CONNECTOR`. Deploy production:

```bash
VERCEL_USE_EXPERIMENTAL_FRAMEWORKS=1 vercel deploy --prod
```

The bot responds to DMs and channel messages that explicitly mention it. It does not continue ambient thread conversation.
