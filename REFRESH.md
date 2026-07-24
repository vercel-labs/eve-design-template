# Refresh the design corpus

Use this workflow when approved guidance changes.

1. Keep `manifest.status` approved while preparing a refresh; the deployed agent continues using the last production commit.
2. Confirm the organization can store each changed source.
3. Add a new immutable, dated snapshot. Never modify the old snapshot.
4. Add or update its manifest entry. Mark the replaced entry `superseded`.
5. Update normalized guidelines and source metadata.
6. Show the owner a focused diff of source, rule, precedence, and routing changes.
7. Surface new gaps and equal-priority conflicts. Do not resolve them by inference.
8. Require explicit owner approval.
9. Update `approval.approvedBy` and `approval.approvedAt`.
10. Run `pnpm check`, then commit and push to deploy production.

The runtime never fetches source URLs. A refresh is always a reviewed repository change.
