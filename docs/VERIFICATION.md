# Publication audit evidence

This is an unpublished preview, not a readiness approval.

## Reproduce

- `pnpm install --frozen-lockfile`
- `pnpm build && pnpm typecheck && pnpm typecheck:ci && pnpm lint`
- `pnpm test:coverage` — 100% statements, branches, functions and lines required.
- `pnpm test:package` — packs locally, installs in a temporary independent consumer, checks strict NodeNext types (without skipLibCheck), runtime exports, and the source test helper against an unrelated host schema under Bundler resolution. No publish command is run.
- With an isolated writable HOME: `CONVEX_AGENT_MODE=anonymous pnpm convex dev --once --local-cloud-port 3330 --local-site-port 3331 --typecheck disable --run actions:verify`.

Observed on Darwin arm64, Node 26.7.0, Convex 1.45.0: real local action returned `{ admitted: 3, schedulerDrained: true }` for 12 simultaneous join calls against capacity 3 followed by batch-size-1 scheduled deletion. CLI generated the checked-in bindings. This checks actual transactions and scheduler execution, not every possible interleaving. Unit tests additionally replay stale deletion jobs after ref reuse and verify pagination and orphan cleanup.

The harness managed-process tool returned `TASK_PROCESS_HOST_UNAVAILABLE`; the local backend check used bounded blocking `dev --once` instead. No cloud deployment or credential access was used. The first standalone `pnpm codegen` failed without a deployment; anonymous local `dev` subsequently generated bindings successfully.

## Remaining limitations / review requirements

- Package AGENTS now links official component authoring guidance; the absent generated guidance link was removed without fabricating generated files.
- `eraseSubject` has explicitly best-effort concurrent-write semantics, not a privacy tombstone; hosts must block new joins during deletion.
- Scope, bucket and subject refs are bounded to 1..256 characters in reads and writes; capacity, batch sizes and list sizes reject unsafe integers.
- The actual runtime check now mounts a second independent instance, inserts the same bucket ref, and verifies first-mount cleanup leaves the second mount intact.
- Node 20.19.0 was verified with `pnpm dlx node@20.19.0 node_modules/vitest/vitest.mjs run --coverage`: 26 tests passed, 100% across all four coverage metrics. The actual backend CLI run used Node 26.
- Review of the frozen final diff and independent verification are still required before publication readiness. No push, merge, release, or publish has been performed by this audit.

## Strict-lint rework verified

The initial lint evidence applied only the component preset and excluded examples. The corrected configuration includes the typed base preset, clients, shared code, examples and scripts and passes with zero warnings. Explicit action return typing breaks the generated API inference cycle; indexed lookup helpers keep transaction bodies coherent; tests are split into focused scenarios. Exceptions are limited to external ESLint rule IDs, the existing four-parameter public client signatures, and Convex-required null cursors/results. No safety-rule or coverage exemptions were added. Coverage includes `src/test.ts`, unrelated host-schema registration and every module loader. All four coverage metrics pass at 100%.

## Interrupted stable-release recovery

Stable workflows are opt-in, main-only and non-canceling. They publish the already-reviewed package.json version; version bumps must land through a signed PR, never an automated unsigned commit onto protected main. They still tag before npm publication and deliberately fail closed if the tag already exists. If interrupted, do not delete/move tags or blindly rerun. A maintainer must inspect the immutable tag commit, npm version presence and tarball integrity, and GitHub release state. If npm is absent, reproduce gates and the exact tagged tarball before an explicitly authorized manual publication; if npm exists, verify integrity and finish only missing release metadata. Integrity mismatch is a hard stop. Never bump another version merely to hide an uncertain partial release. This audit does not authorize performing recovery or publication.
