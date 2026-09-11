# API Reference — @vllnt/convex-buckets

**Compatibility:** `convex@^1.45.0`

```ts
const buckets = new Buckets(components.buckets, { defaultScope: "global" });
```

### `open(ctx, { bucketRef?, capacity?, scope? })` → `bucketRef`

### `join(ctx, bucketRef, subjectRef, scope?)`

`{ joined: true }` or `{ joined: false, reason: "missing" | "locked" | "closed" | "already_member" | "full" }`.

### `leave` / `lock` / `close` → boolean

Leave is allowed while `open` or `locked`, not `closed`.

### `get` / `listMembers` / `eraseBucket` / `eraseSubject`
