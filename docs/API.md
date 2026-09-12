# API Reference — @vllnt/convex-buckets

**Compatibility:** `convex@^1.45.0`

```ts
import { Buckets } from "@vllnt/convex-buckets";

const buckets = new Buckets(components.buckets, { defaultScope: "global" });
```

`bucketRef` and `subjectRef` are opaque host strings (1..256 characters).

### `open(ctx, { bucketRef?, capacity?, scope? })` → `bucketRef`

Creates an `open` bucket. `capacity` must be a positive integer when set.
Host-supplied `bucketRef` must be unique in the scope (`BUCKET_EXISTS`).

### `join(ctx, bucketRef, subjectRef, scope?)`

`{ joined: true }` or `{ joined: false, reason }`.

Reasons: `missing` | `locked` | `closed` | `already_member` | `full`.

Capacity uses `memberCount` on the bucket row (OCC-safe).

### `leave(ctx, bucketRef, subjectRef, scope?)` → `boolean`

Allowed while `open` or `locked`. Returns `false` if closed, missing, or not a member.

### `lock(ctx, bucketRef, scope?)` / `close(ctx, bucketRef, scope?)` → `boolean`

`lock` only from `open`. `close` from `open` or `locked` (terminal).

### `get(ctx, bucketRef, scope?)`

Bucket state including `memberCount`, or `null`.

### `listMembers(ctx, bucketRef, scope?, limit?)`

Default `limit` 100, max 500.

### `eraseBucket` / `eraseSubject`

Delete in batches (default 200, max 500) and reschedule until clean.
`eraseSubject` also decrements `memberCount` on remaining buckets.
