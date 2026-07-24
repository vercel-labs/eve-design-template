# Bootstrap your design agent

Use this workflow with the person who owns your organization's design guidance.

The output is a reviewed design corpus under `knowledge/`. The owner, not the coding agent, approves it.

## Guardrails

- Work only under `knowledge/` and `branding/`, unless the owner requests documentation changes.
- Use only sources the owner provides or explicitly approves.
- Confirm the organization can store every source in this repository.
- Fetch only approved URLs. Do not crawl a site or follow links to new sources.
- Preserve source material under `knowledge/sources/`. Never edit an existing snapshot.
- Give every retained snapshot file its own manifest entry. Do not leave working notes under `knowledge/`.
- Treat interview answers as source material. Confirm the record before using it.
- Mark proposals and inferences as draft until the owner confirms them.
- Do not store secrets, credentials, Slack history, or conversation attachments.
- Use a private repository for private guidance.
- Keep `knowledge/manifest.json` set to `draft` until explicit approval.

## 1. Find the starting point

Inspect the current manifest and knowledge folders. Summarize their state in five bullets or fewer.

Then ask:

1. Do you have existing design guidance? Share the exact URLs, files, or text. Say `none` if it does not exist.
2. Who owns the final design decisions? Include their Slack member ID.
3. What products, surfaces, and decisions should this agent help with?

Ask one small batch at a time. Do not ask questions already answered by a source.

Choose the matching path:

- **Existing guidance:** capture it, extract explicit rules, then ask only about material gaps.
- **Partial guidance:** capture it, show what it covers, then interview for missing decisions.
- **No guidance:** run the design interview in section 3 and turn the confirmed answers into the first source.

## 2. Capture approved sources

Accept:

- Explicit URLs.
- Pasted guidance.
- Local files.
- Product or code examples the owner identifies as evidence.
- Confirmed design interview notes.

For each source:

1. Confirm the organization has the right to commit it.
2. Assign a short source ID using lowercase letters, numbers, and hyphens.
3. Save an unchanged snapshot under `knowledge/sources/<source-id>/<YYYY-MM-DD>/`.
4. Add it to `knowledge/manifest.json`.
5. Record its title, origin, canonical capture time, owner, priority, status, and rights confirmation.

Use `100` as the default priority. Higher numbers take precedence. Propose a precedence table and ask the owner to confirm it. Do not infer precedence from document age, specificity, or format.

For third-party material the organization does not own, do not snapshot it unless its license permits redistribution. Instead, capture the owner's decisions as the organization's own rules and record the third-party URL in the confirmed interview record.

When a URL redirects, record the final URL as the origin. Ask before fetching any other URL.

## 3. Interview for missing guidance

Skip topics already answered by approved sources. Ask four or fewer related questions per message.

Cover:

### Scope

- Who uses the product?
- Which surfaces and tasks are in scope?
- What is explicitly out of scope?
- Which user or business outcomes matter most?

### Principles

- What are the ranked design principles?
- What tradeoffs should the team make when principles compete?
- Which products or experiences are good references, and why?
- Which patterns should the agent reject, and why?

### Foundations

- What are the accessibility requirements?
- Which color, typography, spacing, layout, icon, and motion rules matter?
- Which tokens or libraries are canonical?
- What responsive behavior is required?

### Components and interaction

- Which components and patterns are preferred?
- How should loading, empty, error, success, destructive, and permission states behave?
- Which navigation, form, table, modal, notification, and confirmation patterns matter?
- What exceptions are allowed?

### Content

- What voice should the product use?
- Which terms are preferred or prohibited?
- How should labels, instructions, validation, errors, and destructive actions be written?

### Unknowns

- May the agent give clearly labeled general design recommendations when the corpus is silent?
- Which gaps should remain unanswered?
- Who resolves new conflicts?

For every answer, label it:

- `Explicit`: stated by an approved source or the owner.
- `Proposed`: suggested by the coding agent and awaiting confirmation.
- `Open`: unresolved.

If no prior source exists, write a neutral Q&A record from the owner's answers. Show it for correction. After confirmation and rights approval, save it as an immutable source snapshot.

After Scope, Principles, and Unknowns, offer to stop. A small confirmed corpus is enough to launch. Add foundations, interaction, and content later through `REFRESH.md`.

## 4. Write actionable guidelines

Write concise Markdown under `knowledge/guidelines/`. Organize by decision topic, not by source.

Each file must start with:

```md
<!-- sources: product-guidelines, writing-guide -->
<!-- priority: 100 -->
```

A file can cite multiple sources only when they have the same priority. Every rule in the file must share that source set. Split the file when either changes.

Each rule should state:

- The decision or action.
- Where it applies.
- Meaningful exceptions.
- A concrete good or bad example when it removes ambiguity.

Avoid vague rules such as "make it clean" or "keep it intuitive." Preserve product context and intentional exceptions.

Only confirmed guidance can become an active rule. Keep `Proposed` and `Open` items in the approval packet, never under `knowledge/guidelines/`.

## 5. Handle conflicts

- Apply the higher-priority source.
- Do not merge conflicting rules with equal priority.
- Record the equal-priority conflict in the relevant guideline.
- State the competing rules without choosing one.
- Require the design owner to resolve it.

An unresolved equal-priority conflict may remain in an approved corpus only when the guideline tells the runtime agent to report the conflict and send it to the design owner.

## 6. Configure the agent

Ask for any missing runtime choices:

- Agent name and one-line description.
- Optional PNG or JPEG Slack icon.
- Whether labeled general recommendations are allowed.
- Optional Slack channel and member allowlists.
- Preferred voice, terms, and prohibited language not already covered by the corpus.

Reuse the answer from Unknowns for `allowGeneralGuidance`. Do not ask twice.

Each empty allowlist leaves that dimension unrestricted. Copy member IDs from Slack profiles and channel IDs from channel details.

Store identity, ownership, general-guidance policy, and allowlists in `knowledge/manifest.json`. Store an icon under `branding/` and set `agent.iconPath`. Treat confirmed voice and terminology answers as sourced guidelines, not manifest fields.

If Slack Connect already exists, remind the owner to update its visible name, description, and icon in Vercel Connect settings.

## 7. Prepare the approval packet

Run:

```bash
pnpm verify:knowledge
```

Show the owner:

- Source inventory, origins, owners, rights confirmation, and status.
- Confirmed precedence table.
- Guideline files added or changed.
- Proposed rules awaiting confirmation.
- Conflicts and gaps.
- Agent identity, general-guidance policy, and allowlists.
- Exact files changed.

Keep this review concise. Do not hide unresolved items in prose.

Ask exactly:

> Do you approve this design corpus for the agent to use?

Approval must be explicit. Corrections, partial agreement, or approval of a source alone do not approve the corpus.

## 8. Approve and publish

After explicit corpus approval:

1. Add accepted proposals to the guidelines and interview record. If that record is already saved, add a new dated snapshot with a new source ID and mark the prior entry `superseded`.
2. Mark active sources `approved`.
3. Mark replaced sources `superseded`.
4. Set `manifest.status` to `approved`.
5. Record the approver and current canonical ISO timestamp, such as `2026-07-24T00:00:00.000Z`.
6. Run `pnpm check`.
7. Show the final diff and check result.

Ask separately before committing, pushing, or deploying. Corpus approval does not authorize publication.

Git-connected Vercel projects deploy after a push to the production branch. Otherwise deploy with:

```bash
pnpm exec vercel deploy --prod
```
