<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.
<!-- convex-ai-end -->

# @vllnt/convex-buckets

Ephemeral groups of opaque `subjectRef`s. Follows the vllnt Component Standard
(hub `AGENTS.md`).

`AGENTS.md` is the sole agent-instruction source. Do not add `CLAUDE.md`.

## Ownership

- **Component owns:** bucket row, membership rows, `open → locked → closed`.
- **Host owns:** auth, what the group means, `subjectRef`.
- **Not this component:** standing memberships, presence, scores.

100% coverage is BLOCKING. No bare `v.any()`.
