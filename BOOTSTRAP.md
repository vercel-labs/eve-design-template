# Bootstrap your design agent

Give this file to Codex, Claude Code, Conductor, or another coding agent in a clone of this repository. Complete the workflow with the person who owns the organization's design guidance.

Do not change `knowledge/manifest.json` to `approved` until the owner explicitly approves the generated corpus.

## Rules

- Work only under `knowledge/` and `branding/`, except for documentation changes the owner requests.
- Never add a source without confirmation that the organization has the right to store it in this repository.
- Do not crawl a site. Fetch only URLs the owner explicitly approves.
- Preserve source material exactly under `knowledge/sources/`.
- Never edit an existing source snapshot. Add a dated replacement.
- Keep inferred rules in draft until the owner confirms them.
- Do not store secrets, credentials, private Slack history, or conversation attachments.
- This repository stores the corpus. Use a private repository for private guidance.

## 1. Establish configuration

Ask one grouped set of questions:

1. Agent name, one-line description, and optional PNG or JPEG Slack icon.
2. Design owner's Slack member ID.
3. Whether clearly labeled general design recommendations are allowed.
4. Optional Slack channel and member allowlists. Empty means any member may invoke the bot in a channel where it is installed.
5. Desired voice, preferred terms, and prohibited language.

Update `manifest.json` with these answers. Store an optional icon under `branding/` and set `agent.iconPath`. Leave the manifest status as `draft`. If Slack Connect was already created by the Deploy button or `pnpm run setup`, remind the owner to update its visible identity in Vercel Connect settings.

## 2. Collect approved sources

Ask for any combination of:

- Explicit public URLs.
- Pasted design guidance.
- Local files.
- Product or code examples the owner wants treated as evidence.

For each source:

1. Confirm the owner has the right to commit it.
2. Capture it unchanged under `knowledge/sources/<source-id>/<ISO-date>/`.
3. Add a manifest entry with origin, capture time, owner, priority, status, and `rightsConfirmed`.
4. Ask before fetching any additional link, even when it looks relevant.

If guidance already exists, inspect it and report only material gaps. Ask only the missing questions from the next section.

## 3. Fill gaps

When sources are absent or incomplete, interview the owner about:

- Scope and non-goals.
- Users and product context.
- Ranked design principles.
- Voice, terms, and prohibited language.
- Accessibility baseline.
- Color, typography, spacing, and visual foundations.
- Components and interaction patterns.
- Good and bad examples, including why.
- Source precedence and the design owner.
- Behavior when guidance is missing.

Distinguish explicit rules from inferences. Inferences remain draft until confirmed.

## 4. Normalize guidance

Write concise Markdown under `knowledge/guidelines/`. Organize by topic, not source.

Each rule must include enough metadata for maintainers to trace it:

```md
<!-- sources: product-guidelines, writing-guide -->
<!-- priority: 100 -->
```

Preserve meaningful exceptions and product-specific context. Do not invent consistency by merging equal-priority conflicts. Record the conflict and ask the owner to resolve it.

## 5. Review

Show the owner:

- Added source snapshots.
- Normalized rules.
- Inferences awaiting confirmation.
- Conflicts and gaps.
- Agent identity, general-guidance policy, and allowlists.

Run:

```bash
pnpm verify:knowledge
```

Ask explicitly: “Do you approve this design corpus for the agent to use?”

Only after an explicit yes:

1. Mark active sources `approved`.
2. Set `manifest.status` to `approved`.
3. Record the approver and current canonical ISO timestamp, such as `2026-07-24T00:00:00.000Z`.
4. Run `pnpm check`.
5. Commit and push. If the Vercel project is not Git-connected, run `pnpm exec vercel deploy --prod` after pushing.
