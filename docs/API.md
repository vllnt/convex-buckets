# API Reference — @vllnt/convex-buckets

**Compatibility:** `convex@^1.45.0`

```ts
import { Buckets } from "@vllnt/convex-buckets";

const buckets = new Buckets(components.buckets, { defaultScope: "global" });
```

`bucketRef` and `subjectRef` are opaque host strings (1..256 characters).

### `open(ctx, { bucketRef?, capacity?, scope? })` → `bucketRef`

Creates an `open` bucket. `capacity` must be a positive safe integer when set.
Host-supplied `bucketRef` must be unique in the scope (`BUCKET_EXISTS`).

### `join(ctx, bucketRef, subjectRef, scope?)`

`{ joined: true }` or `{ joined: false, reason }`.

Reasons: `missing` | `locked` | `closed` | `already_member` | `full`.

Capacity uses `memberCount` on the bucket row (OCC-safe).

### `leave(ctx, bucketRef, subjectRef, scope?)` → `boolean`

Allowed while `open` or `locked`. Returns `false` if closed, missing, or not a
member.

### `lock(ctx, bucketRef, scope?)` / `close(ctx, bucketRef, scope?)` → `boolean`

`lock` only from `open`. `close` from `open` or `locked` (terminal).

### `get(ctx, bucketRef, scope?)`

Bucket state including `memberCount`, or `null`.

### `listMembers(ctx, bucketRef, scope?, limit?)`

Returns a bounded preview array, default `limit` 100, max 500. It does not
indicate truncation. Use pagination to enumerate all members.

### `paginateMembers(ctx, bucketRef, paginationOpts, scope?)`

`paginationOpts` is Convex `PaginationOptions`: start with
`{ cursor: null, numItems: 100 }`, then pass the returned `continueCursor` until
`isDone`. `numItems` must be an integer in 1..500. Returns
`{ page: { subjectRef, joinedAt }[], isDone, continueCursor }`, ordered by
membership creation within the scope and bucket. Pagination across separate
calls is not a frozen snapshot under concurrent writes.

### `eraseBucket(ctx, bucketRef, scope?, batch?)` → `number`

Closes the bucket atomically, deletes up to `batch` members (default 200, max
500), and updates the remaining count. Reschedules by original bucket document
ID until removed. The ref cannot be reused while cleanup is pending; stale
continuations cannot touch a replacement. Returns only rows deleted in this
invocation, not the total. Observe `get === null` for completion.

### `eraseSubject(ctx, subjectRef, scope?, batch?)` → `number`

Batched best-effort membership sweep, also decrementing counts of remaining
buckets and tolerating orphan rows. Returns only this batch's deletion count.
This is not a tombstone or snapshot: hosts needing privacy erasure must stop new
joins for the subject until cleanup is complete. Concurrent joins can otherwise
be included in later batches or survive after the last batch.

Batch sizes and preview limits must be positive integers and are clamped to
their maximum. Invalid refs, capacity, batch and limit produce code-tagged
`ConvexError`s (`INVALID_REF`, `INVALID_CAPACITY`, `INVALID_BATCH`,
`INVALID_LIMIT`). Queries currently accept arbitrary string refs; mutation
bucket/subject refs enforce 1..256 characters. Scope is an opaque string with no
package-specific length limit. The host must authorize it; it is not an
access-control boundary.
