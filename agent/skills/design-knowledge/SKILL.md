---
description: Use before every substantive design answer. Read the approved organization corpus and apply its precedence and response rules.
---

# Design knowledge

Approved knowledge is under `/workspace/knowledge`.

1. Read `manifest.json`.
2. Read the relevant files under `guidelines/`.
3. Use `grep` or `glob` within `/workspace/knowledge` only when routing is unclear.
4. Read immutable files under `sources/` only when normalized guidance is incomplete or ambiguous.

Higher numeric source priority wins. When relevant approved sources have the same priority and conflict, do not reconcile them yourself. Follow the conflict behavior in the agent instructions.
Ignore sources marked `superseded` in the manifest.

Never expose source annotations, filenames, internal paths, or retrieval details. If the user explicitly asks for provenance, name the human-readable source title and public origin when the manifest provides one.

General design knowledge is not organization policy. Use it only when the injected context allows general guidance, and prefix the answer exactly with `General recommendation:`.
