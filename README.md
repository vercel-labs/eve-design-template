# Eve design agent template

A generic, Slack-only design collaborator grounded in your organization's approved design guidelines.

> Experimental: this template uses Eve preview APIs pinned to `0.27.3`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Feve-design-template%2Ftree%2Fmain&connect=%5B%7B%22type%22%3A%22slack%22%2C%22env%22%3A%22SLACK_CONNECTOR%22%2C%22triggers%22%3Atrue%2C%22triggerPath%22%3A%22%2Feve%2Fv1%2Fslack%22%7D%5D)

## What it does

- Answers Slack DMs.
- Answers channel messages only when explicitly mentioned.
- Reads a reviewed, repository-owned design corpus.
- Accepts message text, images, and documents as temporary turn context.
- Clearly labels general recommendations when your corpus does not cover a topic.
- Escalates unresolved shared-channel conflicts to the configured design owner.

It does not search Slack or the web, edit artifacts, generate websites, deploy projects, or write to its corpus at runtime.

Each top-level mention or DM starts a conversation. Continue in its Slack reply thread; channel follow-ups must mention the agent again.

## Set up

1. Click **Deploy with Vercel** and authorize Slack.
2. Clone the generated repository.
3. Open [`BOOTSTRAP.md`](./BOOTSTRAP.md) with Codex, Claude Code, Conductor, or another coding agent.
4. Review and explicitly approve the generated corpus.
5. Commit and push to `main`.

Until approval, every invocation receives:

> Design-agent setup is incomplete. Run the bootstrap workflow and approve the generated design corpus.

For an existing Vercel project, install dependencies and run the resumable setup:

```bash
pnpm install
pnpm run setup
```

It links the project, creates or reuses a Slack connector, attaches only the production trigger, deploys production, and checks the Eve health and Slack routes through Deployment Protection. Slack authorization opens in the browser when required.

CLI-linked projects do not deploy on Git pushes unless Git integration is also configured. After corpus changes, run `pnpm exec vercel deploy --prod` or rerun `pnpm run setup`.

See [`docs/manual-slack-setup.md`](./docs/manual-slack-setup.md) for direct Slack credentials.

## Develop

Requires Node.js 24 and pnpm 10.

```bash
pnpm install
pnpm exec vercel link
pnpm exec vercel env pull
pnpm dev
```

Useful commands:

```bash
pnpm verify:knowledge
pnpm test
pnpm type-check
pnpm build
pnpm run info
pnpm check
```

Set `DESIGN_AGENT_MODEL` to override the pinned default, `anthropic/claude-sonnet-4.6`.

## Knowledge model

- `knowledge/sources/`: immutable approved snapshots.
- `knowledge/guidelines/`: normalized, actionable rules.
- `knowledge/manifest.json`: ownership, provenance, priority, access policy, and approval.
- [`REFRESH.md`](./REFRESH.md): reviewed update workflow.

The corpus is committed to the adopter's repository and bundled at build time. Use a private repository for private design guidance.

## Runtime safety

The agent can read and search its bundled corpus. Shell, file writes, web access, delegation, todo management, and sandbox network access are disabled. It has no connectors beyond Slack credentials.

## License

MIT
