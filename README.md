<!-- Badges -->
[![convex-component](https://img.shields.io/badge/convex-component-EE342F.svg)](https://www.convex.dev/components)
[![npm](https://img.shields.io/npm/v/@vllnt/convex-buckets.svg)](https://www.npmjs.com/package/@vllnt/convex-buckets)
[![CI](https://github.com/vllnt/convex-buckets/actions/workflows/ci.yml/badge.svg)](https://github.com/vllnt/convex-buckets/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@vllnt/convex-buckets.svg)](./LICENSE)

# @vllnt/convex-buckets

Ephemeral groups of opaque `subjectRef`s — matches, lobbies, cohorts.

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

- **Capacity + OCC** — `memberCount` lives on the bucket row so concurrent joins retry instead of overfilling.
- **Join reasons** — `missing` / `locked` / `closed` / `already_member` / `full`.
- **Leave** while `open` or `locked`, not after `close`.
- **Bounded list** — `listMembers` defaults to 100 rows (max 500).
- **Bounded erase** — `eraseBucket` / `eraseSubject` delete in batches and reschedule.
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
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { Buckets } from "@vllnt/convex-buckets";

const buckets = new Buckets(components.buckets);

export const startMatch = mutation({
  args: {},
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

| Method | Kind | Result |
|--------|------|--------|
| `open(ctx, opts?)` | mutation | `bucketRef` |
| `join(ctx, bucketRef, subjectRef, scope?)` | mutation | `{ joined, reason? }` |
| `leave(ctx, bucketRef, subjectRef, scope?)` | mutation | `boolean` |
| `lock` / `close` | mutation | `boolean` |
| `get(ctx, bucketRef, scope?)` | query | bucket state or `null` |
| `listMembers(ctx, bucketRef, scope?, limit?)` | query | `{ subjectRef, joinedAt }[]` |
| `eraseBucket` / `eraseSubject` | mutation | `number` deleted this pass |

Full reference: [docs/API.md](docs/API.md).

## React

Backend-only — no `./react` entry.

## Security

- Auth-agnostic — the host resolves identity and passes an opaque `subjectRef`.
- Tables sandboxed — reached only through the exported functions.
- Capacity is enforced by patching `memberCount` on the bucket document (OCC).

## Testing

```bash
pnpm test
pnpm test:coverage
```

Tests run against the real component runtime via `convex-test` (`@edge-runtime/vm`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

Built by [bntvllnt](https://github.com/bntvllnt) · [bntvllnt.com](https://bntvllnt.com) · [X @bntvllnt](https://x.com/bntvllnt)

Part of the [@vllnt](https://github.com/vllnt) Convex component fleet — [vllnt.com](https://vllnt.com)

If this is useful, [sponsor the work](https://github.com/sponsors/bntvllnt).

## License

MIT — see [LICENSE](LICENSE).
