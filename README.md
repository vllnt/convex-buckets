<!-- Badges -->
[![convex-component](https://img.shields.io/badge/convex-component-EE342F.svg)](https://www.convex.dev/components)
[![license](https://img.shields.io/npm/l/@vllnt/convex-buckets.svg)](./LICENSE)

# @vllnt/convex-buckets

Ephemeral groups of opaque `subjectRef`s — matches, lobbies, cohorts.

Not standing orgs (`convex-memberships`), not liveness (`@convex-dev/presence`).

```ts
const buckets = new Buckets(components.buckets);
const id = await buckets.open(ctx, { capacity: 4 });
await buckets.join(ctx, id, subjectRef);
await buckets.lock(ctx, id);
await buckets.close(ctx, id);
```

Lifecycle: `open` → `locked` (no new joins) → `closed` (terminal).

Peer dependency: `convex@^1.45.0`.

```ts
import buckets from "@vllnt/convex-buckets/convex.config";
app.use(buckets);
```

## Author

Maintained by [bntvllnt](https://github.com/bntvllnt) · [bntvllnt.com](https://bntvllnt.com)
