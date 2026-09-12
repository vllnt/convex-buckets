<!-- Badges -->

[![convex-component](https://img.shields.io/badge/convex-component-EE342F.svg)](https://www.convex.dev/components)
[![npm](https://img.shields.io/npm/v/@vllnt/convex-buckets.svg)](https://www.npmjs.com/package/@vllnt/convex-buckets)
[![CI](https://github.com/vllnt/convex-buckets/actions/workflows/ci.yml/badge.svg)](https://github.com/vllnt/convex-buckets/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@vllnt/convex-buckets.svg)](./LICENSE)

# @vllnt/convex-buckets

Ephemeral groups of opaque `subjectRef`s — matches, lobbies, cohorts.

Unreleased private preview; the installation command below describes the planned
package.

Not standing orgs (`@vllnt/convex-memberships`), not liveness
(`@convex-dev/presence`).

```ts
const buckets = new Buckets(components.buckets);
const id = await buckets.open(ctx, { capacity: 4 });
await buckets.join(ctx, id, subjectRef);
await buckets.lock(ctx, id);
await buckets.close(ctx, id);
```

Lifecycle: `open` → `locked` (no new joins) → `closed` (terminal).

## Features

- **Capacity + OCC** — `memberCount` lives on the bucket row so concurrent joins
  retry instead of overfilling.
- **Join reasons** — `missing` / `locked` / `closed` / `already_member` /
  `full`.
- **Leave** while `open` or `locked`, not after `close`.
- **Pagination** — `paginateMembers` returns a cursor and completion flag;
  `listMembers` is only a bounded preview (default 100, max 500).
- **Bounded erase** — `eraseBucket` reschedules fenced batches;
  `eraseSubject` deletes one batch per call, without background subject sweeps.
- **Scopes** — default `"global"`.

## Installation

```bash
pnpm add @vllnt/convex-buckets
```

Peer dependency: `convex@^1.45.0`.

## Usage

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import bucketsConfig from "@vllnt/convex-buckets/convex.config";

const app = defineApp();
app.use(bucketsConfig);
export default app;
```

```ts
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { Buckets } from "@vllnt/convex-buckets";

const buckets = new Buckets(components.buckets);

export const startMatch = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const subjectRef = /* host-resolved identity */ "user_1";
    const id = await buckets.open(ctx, { capacity: 4 });
    const joined = await buckets.join(ctx, id, subjectRef);
    if (!joined.joined) throw new Error(joined.reason ?? "join failed");
    return id;
  },
});
```

## API Reference

| Method                                                    | Kind     | Result                                       |
| --------------------------------------------------------- | -------- | -------------------------------------------- |
| `open(ctx, opts?)`                                        | mutation | `bucketRef`                                  |
| `join(ctx, bucketRef, subjectRef, scope?)`                | mutation | `{ joined, reason? }`                        |
| `leave(ctx, bucketRef, subjectRef, scope?)`               | mutation | `boolean`                                    |
| `lock` / `close`                                          | mutation | `boolean`                                    |
| `get(ctx, bucketRef, scope?)`                             | query    | bucket state or `null`                       |
| `listMembers(ctx, bucketRef, scope?, limit?)`             | query    | bounded preview `{ subjectRef, joinedAt }[]` |
| `paginateMembers(ctx, bucketRef, paginationOpts, scope?)` | query    | `{ page, isDone, continueCursor }`           |
| `eraseBucket` / `eraseSubject`                            | mutation | `number` deleted this pass                   |

Full reference: [docs/API.md](docs/API.md).

## React

Backend-only — no `./react` entry.

## Security

- Auth-agnostic — the host must authorize every read/write and derive allowed
  scopes and subject refs. Scopes are namespaces, not authorization. The
  unauthenticated example is for local testing only.
- Tables sandboxed — reached only through the exported functions.
- Capacity is enforced by patching `memberCount` on the bucket document (OCC).

## Testing

```bash
pnpm test
pnpm test:coverage
```

Unit tests use the simulated `convex-test` runtime (`@edge-runtime/vm`), not a
real backend. `example/convex/actions.ts` additionally checks concurrent
capacity admission and scheduled cleanup on a real local Convex backend. Run
with an isolated HOME and
`CONVEX_AGENT_MODE=anonymous pnpm convex dev --once --local-cloud-port 3330 --local-site-port 3331 --run actions:verify`.
This is targeted evidence, not proof of every concurrency interleaving.

## Cleanup and isolation

`eraseBucket` closes the bucket and updates its remaining count in the first
transaction. Its ref stays reserved until all members are removed. Scheduled
continuation uses the original document ID, so stale work cannot erase a
replacement bucket. Return values count only the current batch; completion is
observed through `get` returning `null`.

`eraseSubject` deletes one bounded batch per call and schedules no continuation.
Block new joins while draining, repeat until it returns zero, then permit joins if
appropriate. A returned zero is only an observation of current membership, not a
permanent ban. No queued subject sweep can later remove a recreated membership.

Multiple mounts are isolated: `app.use(bucketsConfig, { name: "first" })` and
`app.use(bucketsConfig, { name: "second" })`, accessed through separate
`Buckets(components.first)` / `Buckets(components.second)` clients. Scopes
partition data within one mount.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

Built by [bntvllnt](https://github.com/bntvllnt) ·
[bntvllnt.com](https://bntvllnt.com) · [X @bntvllnt](https://x.com/bntvllnt)

Part of the [@vllnt](https://github.com/vllnt) Convex component fleet —
[vllnt.com](https://vllnt.com)

If this is useful, [sponsor the work](https://github.com/sponsors/bntvllnt).

## License

MIT — see [LICENSE](LICENSE).
