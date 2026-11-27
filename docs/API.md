# API Reference — @vllnt/convex-buckets

**Compatibility:** `convex@^1.45.0`, Node.js `>=20.19.0`

## Entry points

| Import                                                  | Exports                                                                                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@vllnt/convex-buckets`                                 | `Buckets` class; types `BucketsComponent`, `BucketsOptions`, `BucketState`, `BucketStatus`, `JoinResult`, `MemberState`, `OpenOptions` |
| `@vllnt/convex-buckets/convex.config` (or `.js`)        | default component config for `app.use(...)`                                                                                            |
| `@vllnt/convex-buckets/test`                            | `register(t, name = "buckets")` for `convex-test` (TypeScript source; needs Vite `import.meta.glob`)                                   |
| `@vllnt/convex-buckets/_generated/component` (or `.js`) | type `ComponentApi`                                                                                                                    |

`bucketRef`, `subjectRef` and `scope` are opaque host strings of 1..256
characters. Every method's `scope` defaults to the client's `defaultScope`.

## Client

### `Buckets`

```ts
new Buckets(component: BucketsComponent, options?: BucketsOptions)
```

`component` is the mounted component, `components.buckets` (or the name passed
to `app.use`). `options.defaultScope` defaults to `"global"`. Call the methods
from host mutations (`ctx.runMutation`) and queries (`ctx.runQuery`).

### `open`

```ts
open(ctx, options?: OpenOptions): Promise<string>
```

Creates an `open` bucket and returns its `bucketRef`. `capacity` must be a
positive safe integer when set; omitted means no member limit. An omitted
`bucketRef` is generated. A supplied `bucketRef` must be unused in the scope
(`BUCKET_EXISTS`), including while an `eraseBucket` of that ref is pending.

### `join`

```ts
join(ctx, bucketRef: string, subjectRef: string, scope?: string): Promise<JoinResult>
```

Returns `{ joined: true }` or `{ joined: false, reason }`, where `reason` is
`missing` | `locked` | `closed` | `already_member` | `full`. It does not throw
for these. Capacity is checked against `memberCount` on the bucket row, so
concurrent joins conflict and Convex retries them.

### `leave`

```ts
leave(ctx, bucketRef: string, subjectRef: string, scope?: string): Promise<boolean>
```

Allowed while `open` or `locked`. Returns `false` if the bucket is closed or
missing, or the subject is not a member.

### `lock`

```ts
lock(ctx, bucketRef: string, scope?: string): Promise<boolean>
```

`open` -> `locked`: no new joins. Returns `false` for any other state.

### `close`

```ts
close(ctx, bucketRef: string, scope?: string): Promise<boolean>
```

`open` or `locked` -> `closed` (terminal). Returns `false` if missing or already
closed.

### `get`

```ts
get(ctx, bucketRef: string, scope?: string): Promise<BucketState | null>
```

Returns
`{ bucketRef, status, memberCount, openedAt, capacity?, lockedAt?, closedAt? }`
or `null`. Timestamps are milliseconds since epoch.

### `listMembers`

```ts
listMembers(ctx, bucketRef: string, scope?: string, limit?: number): Promise<MemberState[]>
```

Returns a bounded preview: `limit` defaults to 100, and values above 500 are
clamped to 500. It does not indicate truncation; use `paginateMembers` to read
every member.

### `paginateMembers`

```ts
paginateMembers(ctx, bucketRef: string, paginationOpts: PaginationOptions, scope?: string): Promise<PaginationResult<MemberState>>
```

`paginationOpts` is Convex `PaginationOptions`: start with
`{ cursor: null, numItems: 100 }`, then pass the returned `continueCursor` until
`isDone`. `numItems` must be an integer in 1..500. Returns
`{ page: { subjectRef, joinedAt }[], isDone, continueCursor }`, ordered by
membership creation within the scope and bucket. Pagination across separate
calls is not a frozen snapshot under concurrent writes.

### `eraseBucket`

```ts
eraseBucket(ctx, bucketRef: string, scope?: string, batch?: number): Promise<number>
```

Closes the bucket atomically, deletes up to `batch` members (default 200, max
500), and updates the remaining count. Reschedules by original bucket document
ID until removed. The ref cannot be reused while cleanup is pending; stale
continuations cannot touch a replacement. Returns only rows deleted in this
invocation, not the total. Observe `get === null` for completion.

### `eraseSubject`

```ts
eraseSubject(ctx, subjectRef: string, scope?: string, batch?: number): Promise<number>
```

Deletes at most `batch` memberships (default 200, max 500), updates bucket
counts, and tolerates orphan rows. Returns the number deleted in this
invocation. **Does not schedule a continuation.** The host blocks new joins
while repeatedly calling this method until it returns zero; it may then permit
rejoining without latent subject-erasure jobs. Zero is an observation, not a
permanent ban or a concurrent-write fence. No ordering or uniqueness guarantee
is assumed for `_creationTime`; it is not a safe generation boundary.

## Types

### `BucketsComponent`

The type of `components.buckets`: the component's mutations (`open`, `join`,
`leave`, `lock`, `close`, `eraseBucket`, `eraseSubject`) and queries (`get`,
`listMembers`, `paginateMembers`) as internal function references.

### `BucketsOptions`

`{ defaultScope?: string }`. `defaultScope` defaults to `"global"`.

### `OpenOptions`

`{ bucketRef?: string; capacity?: number; scope?: string }`.

### `BucketState`

`{ bucketRef: string; status: BucketStatus; memberCount: number; openedAt: number; capacity?: number; lockedAt?: number; closedAt?: number }`.

### `BucketStatus`

`"open" | "locked" | "closed"`.

### `JoinResult`

`{ joined: boolean; reason?: string }`. `reason` is typed `string`; its values
are listed under [`join`](#join).

### `MemberState`

`{ subjectRef: string; joinedAt: number }`.

## Other entry points

### `convex.config`

The default export of `@vllnt/convex-buckets/convex.config` is the component
definition. Mount it with `app.use(config)`, or `app.use(config, { name })` for
several isolated mounts.

### `register`

```ts
register(t: TestConvex<SchemaDefinition<GenericSchema, boolean>>, name?: string): void
```

From `@vllnt/convex-buckets/test`. Mounts the component in a `convex-test`
instance under `name` (default `"buckets"`). Shipped as TypeScript source that
uses Vite's `import.meta.glob`, so run it under Vitest.

### `ComponentApi`

From `@vllnt/convex-buckets/_generated/component`. The Convex-generated type of
the mounted component, the same shape as `BucketsComponent`.

## Errors

Invalid input throws a `ConvexError` whose `data` is `{ code, message }`. Codes:
`INVALID_REF`, `INVALID_CAPACITY`, `INVALID_BATCH`, `INVALID_LIMIT` and
`BUCKET_EXISTS`. Causes and fixes are in the README's
[Errors and fixes](../README.md#errors-and-fixes) table.

Batch sizes and preview limits must be positive safe integers and are clamped to
their maximum. Scope, bucket and subject refs enforce 1..256 characters,
including on reads. The host must authorize scope; it is not an access-control
boundary.
