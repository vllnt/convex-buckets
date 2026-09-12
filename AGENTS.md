<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `example/convex/_generated/ai/guidelines.md` first** for
important guidelines on how to correctly use Convex APIs and patterns.
<!-- convex-ai-end -->

# @vllnt/convex-buckets

Ephemeral groups of opaque `subjectRef`s. Follows the vllnt Component Standard
(hub `AGENTS.md`).

`AGENTS.md` is the sole agent-instruction source. Do not add `CLAUDE.md`.

## Architecture

```
src/
├── shared.ts
├── test.ts
├── client/
└── component/   # schema (buckets + members), mutations, queries, validators
```

## Ownership

- **Component owns:** bucket row, membership rows, `open → locked → closed`,
  OCC-safe `memberCount`.
- **Host owns:** auth, what the group means, `subjectRef`.
- **Not this component:** standing memberships, presence, scores.

## Conventions

- Mutations in `mutations.ts`, queries in `queries.ts`.
- Explicit `args` + `returns`. No bare `v.any()`.
- 100% test coverage is BLOCKING.
- `**/_generated/**` is Convex CLI-owned; run `pnpm codegen`.
