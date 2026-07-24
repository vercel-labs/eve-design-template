# Eve design agent template

A Slack design agent that answers from your approved design guidelines.

> Experimental: this template uses Eve preview APIs pinned to `0.27.3`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Feve-design-template%2Ftree%2Fmain&connect=%5B%7B%22type%22%3A%22slack%22%2C%22env%22%3A%22SLACK_CONNECTOR%22%2C%22triggers%22%3Atrue%2C%22triggerPath%22%3A%22%2Feve%2Fv1%2Fslack%22%7D%5D)

## What it does

- Answers Slack DMs.
- Answers channel messages only when mentioned.
- Reads a reviewed design corpus committed to your repository.
- Uses message text, images, and documents as temporary context.
- Labels general recommendations when enabled.
- Flags equal-priority conflicts. In channels, it mentions your design owner.

It cannot search Slack or the web, change its corpus, edit artifacts, generate websites, or deploy projects.

Each DM or top-level mention starts a conversation. Continue in its reply thread. Channel replies must mention the agent again.

## Before you deploy

You need:

- A Vercel account.
- Permission to authorize a Slack app.
- A design owner and their Slack member ID.
- Existing design guidance, or a design owner who can create it with the bootstrap interview.
- A private repository if the guidance is private.

## Set up

1. Click **Deploy with Vercel** and authorize Slack.
2. Clone the generated repository.
3. Install Node.js 24 and pnpm 10, then run `pnpm install`.
4. Open the repository in Codex, Claude Code, Conductor, or another coding agent.
5. Send:

   > Follow `BOOTSTRAP.md` and help me set up this design agent. Ask one small batch of questions at a time. Do not approve or publish the corpus for me.

6. Review the approval packet from `BOOTSTRAP.md` and explicitly approve the corpus.
7. Commit and push to `main`.

Until approval, the agent replies:

> Design-agent setup is incomplete. Run the bootstrap workflow and approve the generated design corpus.

Git-connected projects deploy after the push. Otherwise run:

```bash
pnpm exec vercel deploy --prod
```

## Set up from the CLI

```bash
pnpm install
pnpm run setup
```

The setup script links the project, creates or reuses a Slack connector, attaches its production trigger, deploys production, and checks the Eve health and Slack routes. It opens Slack authorization in the browser when required.

See [`docs/manual-slack-setup.md`](./docs/manual-slack-setup.md) to use direct Slack credentials.

## Knowledge

- `knowledge/sources/`: immutable source snapshots.
- `knowledge/guidelines/`: concise, actionable rules.
- `knowledge/manifest.json`: identity, ownership, provenance, precedence, access, and approval.
- [`BOOTSTRAP.md`](./BOOTSTRAP.md): first-time knowledge setup.
- [`REFRESH.md`](./REFRESH.md): reviewed knowledge updates.

The corpus is bundled at build time. Runtime conversations and attachments never change it.

## Develop

Requires Node.js 24 and pnpm 10.

```bash
pnpm install
pnpm exec vercel link
pnpm exec vercel env pull
pnpm dev
```

Run the full check:

```bash
pnpm check
```

Other commands:

```bash
pnpm verify:knowledge
pnpm test
pnpm type-check
pnpm build
pnpm run info
```

Set `DESIGN_AGENT_MODEL` to override the default model, `anthropic/claude-sonnet-4.6`.

## Runtime safety

The agent can read and search only its bundled corpus. Shell, file writes, web access, delegation, todo management, and sandbox network access are disabled. Slack is its only connector.

## License

MIT
