# Publication audit evidence

This is an unpublished preview, not a readiness approval.

## Reproduce

- `pnpm install --frozen-lockfile`
- `pnpm build && pnpm typecheck && pnpm typecheck:ci && pnpm lint`
- `pnpm test:coverage` — 100% statements, branches, functions and lines required.
- `pnpm test:package` — packs locally, installs in a temporary independent consumer, checks strict NodeNext types (without skipLibCheck) and runtime exports. No publish command is run.
- With an isolated writable HOME: `CONVEX_AGENT_MODE=anonymous pnpm convex dev --once --local-cloud-port 3330 --local-site-port 3331 --typecheck disable --run runtimeCheck:verify`.

Observed on Darwin arm64, Node 26.7.0, Convex 1.45.0: real local action returned `{ admitted: 3, schedulerDrained: true }` for 12 simultaneous join calls against capacity 3 followed by batch-size-1 scheduled deletion. CLI generated the checked-in bindings. This checks actual transactions and scheduler execution, not every possible interleaving. Unit tests additionally replay stale deletion jobs after ref reuse and verify pagination and orphan cleanup.

The harness managed-process tool returned `TASK_PROCESS_HOST_UNAVAILABLE`; the local backend check used bounded blocking `dev --once` instead. No cloud deployment or credential access was used. The first standalone `pnpm codegen` failed without a deployment; anonymous local `dev` subsequently generated bindings successfully.

## Remaining limitations / review requirements

- Package AGENTS references `example/convex/_generated/ai/guidelines.md`, which is absent even after CLI generation. No generated guidance was fabricated or edited.
- `eraseSubject` has explicitly best-effort concurrent-write semantics, not a privacy tombstone; hosts must block new joins during deletion.
- Scope strings have no extra package length bound, and read refs are not constrained; Convex's own input/document limits apply. Mutation bucket/subject refs are bounded to 256 characters. Capacity is limited to safe positive integers.
- Multiple mounts rely on Convex sandbox isolation; the runtime check currently exercises one mount. Scoped unit tests are not independent multi-mount backend proof.
- Node 20.19+ satisfies the installed Convex/Vite floor, but the local check used Node 26, not the CI Node 20 environment.
- Review of the frozen final diff and independent verification are still required before publication readiness. No push, merge, release, or publish has been performed by this audit.
