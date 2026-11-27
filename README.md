# @vllnt/convex-buckets

Convex component that stores short-lived groups of opaque subject refs, such as
matches, lobbies, rooms and cohorts, with capacity limits and an open, locked,
closed lifecycle.

## For coding agents

Docs for the installed version are in `node_modules/@vllnt/convex-buckets/`:
`docs/API.md`, `llms.txt`, `CHANGELOG.md` and the TypeScript `src/`. Read them
before writing code against this package.

## When to use

- Use it when a group lasts for one match, lobby, room or cohort.
- Use it when concurrent joins must never exceed a capacity.
- Use it when you need to stop joins, end the group, then erase it in batches.
- Do not use it when the group outlives a session (orgs, teams, roles): use
  `@vllnt/convex-memberships`.
- Do not use it when you need to know who is online: use `@convex-dev/presence`.

## Install

```bash
pnpm add @vllnt/convex-buckets
```

## Quick start

```ts
// convex/convex.config.ts
import buckets from "@vllnt/convex-buckets/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(buckets);
export default app;
```

```ts
// convex/lobby.ts
import { Buckets } from "@vllnt/convex-buckets";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import { mutation } from "./_generated/server";

const buckets = new Buckets(components.buckets);

export const createLobby = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (user === null) throw new ConvexError("not signed in");
    const bucketRef = await buckets.open(ctx, { capacity: 4 });
    await buckets.join(ctx, bucketRef, user.tokenIdentifier);
    return bucketRef;
  },
});

export const joinLobby = mutation({
  args: { bucketRef: v.string() },
  returns: v.object({ joined: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, { bucketRef }) => {
    const user = await ctx.auth.getUserIdentity();
    if (user === null) throw new ConvexError("not signed in");
    return buckets.join(ctx, bucketRef, user.tokenIdentifier);
  },
});
```

Run `npx convex dev` once to generate `components.buckets`. The component never
reads auth: the host derives `subjectRef` (here the user's `tokenIdentifier`)
and decides who may join.

## API

Full reference: [docs/API.md](docs/API.md).

| Export                                                                                   | Import from                                  | What it does                                                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| [`Buckets`](docs/API.md#buckets)                                                         | `@vllnt/convex-buckets`                      | Host client: `new Buckets(components.buckets, { defaultScope })` |
| [`open(ctx, options?)`](docs/API.md#open)                                                | `Buckets` method, mutation                   | Create an `open` bucket; returns its `bucketRef`                 |
| [`join(ctx, bucketRef, subjectRef, scope?)`](docs/API.md#join)                           | `Buckets` method, mutation                   | Add a member; returns `{ joined, reason? }`                      |
| [`leave(ctx, bucketRef, subjectRef, scope?)`](docs/API.md#leave)                         | `Buckets` method, mutation                   | Remove a member; returns `boolean`                               |
| [`lock(ctx, bucketRef, scope?)`](docs/API.md#lock)                                       | `Buckets` method, mutation                   | `open` -> `locked`; returns `boolean`                            |
| [`close(ctx, bucketRef, scope?)`](docs/API.md#close)                                     | `Buckets` method, mutation                   | `open` or `locked` -> `closed`; returns `boolean`                |
| [`get(ctx, bucketRef, scope?)`](docs/API.md#get)                                         | `Buckets` method, query                      | Bucket state or `null`                                           |
| [`listMembers(ctx, bucketRef, scope?, limit?)`](docs/API.md#listmembers)                 | `Buckets` method, query                      | Up to `limit` members (preview)                                  |
| [`paginateMembers(ctx, bucketRef, paginationOpts, scope?)`](docs/API.md#paginatemembers) | `Buckets` method, query                      | One page of members with a cursor                                |
| [`eraseBucket(ctx, bucketRef, scope?, batch?)`](docs/API.md#erasebucket)                 | `Buckets` method, mutation                   | Close and delete a bucket in batches                             |
| [`eraseSubject(ctx, subjectRef, scope?, batch?)`](docs/API.md#erasesubject)              | `Buckets` method, mutation                   | Delete one batch of a subject's memberships                      |
| [`BucketsComponent`](docs/API.md#bucketscomponent)                                       | `@vllnt/convex-buckets` (type)               | Type of `components.buckets`                                     |
| [`BucketsOptions`](docs/API.md#bucketsoptions)                                           | `@vllnt/convex-buckets` (type)               | `{ defaultScope? }`                                              |
| [`OpenOptions`](docs/API.md#openoptions)                                                 | `@vllnt/convex-buckets` (type)               | `{ bucketRef?, capacity?, scope? }`                              |
| [`BucketState`](docs/API.md#bucketstate)                                                 | `@vllnt/convex-buckets` (type)               | Result of `get`                                                  |
| [`BucketStatus`](docs/API.md#bucketstatus)                                               | `@vllnt/convex-buckets` (type)               | `"open" \| "locked" \| "closed"`                                 |
| [`JoinResult`](docs/API.md#joinresult)                                                   | `@vllnt/convex-buckets` (type)               | Result of `join`                                                 |
| [`MemberState`](docs/API.md#memberstate)                                                 | `@vllnt/convex-buckets` (type)               | `{ subjectRef, joinedAt }`                                       |
| [`default` (component config)](docs/API.md#convexconfig)                                 | `@vllnt/convex-buckets/convex.config`        | Pass to `app.use(...)`                                           |
| [`register`](docs/API.md#register)                                                       | `@vllnt/convex-buckets/test`                 | Mount the component in `convex-test`                             |
| [`ComponentApi`](docs/API.md#componentapi)                                               | `@vllnt/convex-buckets/_generated/component` | Generated type of the mounted component                          |

## Common tasks

Lock a lobby as soon as it is full, so nobody else can join:

```ts
// convex/matchmaking.ts
import { Buckets } from "@vllnt/convex-buckets";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import { mutation } from "./_generated/server";

const buckets = new Buckets(components.buckets);

export const joinAndLockWhenFull = mutation({
  args: { bucketRef: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { bucketRef }) => {
    const user = await ctx.auth.getUserIdentity();
    if (user === null) throw new ConvexError("not signed in");
    const result = await buckets.join(ctx, bucketRef, user.tokenIdentifier);
    const state = await buckets.get(ctx, bucketRef);
    if (state !== null && state.memberCount === state.capacity) {
      await buckets.lock(ctx, bucketRef);
    }
    return result.joined;
  },
});
```

List every member with a cursor (`listMembers` is only a preview):

```ts
// convex/members.ts
import { Buckets } from "@vllnt/convex-buckets";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { query } from "./_generated/server";

const buckets = new Buckets(components.buckets);

export const members = query({
  args: { bucketRef: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    page: v.array(v.object({ joinedAt: v.number(), subjectRef: v.string() })),
  }),
  handler: (ctx, { bucketRef, paginationOpts }) =>
    buckets.paginateMembers(ctx, bucketRef, paginationOpts),
});
```

Erase a finished bucket, and erase one user from every bucket in a scope (for
account deletion). `eraseBucket` schedules its own follow-up batches;
`eraseSubject` does not, so this host function reschedules itself until it
deletes nothing. Block the user's new joins in your own code while it runs.

```ts
// convex/cleanup.ts
import { Buckets } from "@vllnt/convex-buckets";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const buckets = new Buckets(components.buckets);

export const eraseMatch = internalMutation({
  args: { bucketRef: v.string() },
  returns: v.number(),
  handler: (ctx, { bucketRef }) => buckets.eraseBucket(ctx, bucketRef),
});

export const eraseUser = internalMutation({
  args: { subjectRef: v.string() },
  returns: v.null(),
  handler: async (ctx, { subjectRef }) => {
    const deleted = await buckets.eraseSubject(ctx, subjectRef);
    if (deleted > 0) {
      await ctx.scheduler.runAfter(0, internal.cleanup.eraseUser, {
        subjectRef,
      });
    }
    return null;
  },
});
```

Mount the component twice, or split one mount by scope. Named mounts share no
data or scheduled work; scopes are namespaces inside one mount, not access
control.

```ts
// convex/convex.config.ts
import buckets from "@vllnt/convex-buckets/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(buckets, { name: "lobbies" });
app.use(buckets, { name: "cohorts" });
export default app;
```

```ts
// convex/clients.ts
import { Buckets } from "@vllnt/convex-buckets";

import { components } from "./_generated/api";

export const lobbies = new Buckets(components.lobbies);
export const cohorts = new Buckets(components.cohorts, {
  defaultScope: "spring",
});
```

## Errors and fixes

Invalid input throws a `ConvexError` whose `data` is `{ code, message }`. Catch
it in the host with `error instanceof ConvexError` and read `error.data.code`.

| Code               | Message                                                                  | Cause                                                                    | Fix                                                                     |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `INVALID_REF`      | `scope must be 1..256 characters` (or `bucketRef`, `subjectRef`, `refs`) | A scope, bucket or subject ref is empty or longer than 256 characters    | Pass 1..256 characters; hash longer identifiers                         |
| `INVALID_CAPACITY` | `capacity must be a positive integer`                                    | `open` got a capacity that is 0, negative, fractional, NaN or unsafe     | Pass a positive safe integer, or omit `capacity` for no limit           |
| `INVALID_BATCH`    | `batch must be a positive integer`                                       | `eraseBucket` or `eraseSubject` got a batch below 1 or not an integer    | Pass a positive integer or omit it (default 200; above 500 is clamped)  |
| `INVALID_LIMIT`    | `limit must be a positive integer` or `numItems must be 1..500`          | `listMembers` limit below 1 or not an integer; `numItems` outside 1..500 | Pass a positive integer limit; keep `paginationOpts.numItems` in 1..500 |
| `BUCKET_EXISTS`    | `a bucket with this ref already exists in the scope`                     | `open` got a `bucketRef` that is in use, or still being erased           | Omit `bucketRef` to generate one, or wait until `get` returns `null`    |

Arguments of the wrong type (for example a string `capacity`) are rejected by
Convex argument validation before the component runs.

`join` does not throw when it cannot add a member. It returns
`{ joined: false, reason }`:

| `reason`         | Cause                                    | Fix                                               |
| ---------------- | ---------------------------------------- | ------------------------------------------------- |
| `missing`        | No bucket with this ref in the scope     | Check the ref and scope, or `open` the bucket     |
| `locked`         | The bucket was locked                    | Open a new bucket                                 |
| `closed`         | The bucket was closed or is being erased | Open a new bucket                                 |
| `already_member` | The subject is already in the bucket     | Treat as success if joining twice is harmless     |
| `full`           | `memberCount` reached `capacity`         | Open another bucket, or wait for someone to leave |

## Limits and gotchas

- Refs and scopes are 1..256 UTF-16 code units, checked on reads too.
- `capacity` cannot be changed after `open`; there is no update method.
- `listMembers` returns at most `limit` members (default 100). A limit above 500
  is clamped to 500 without an error, and nothing tells you more exist.
- `paginateMembers` requires `numItems` in 1..500 and is not a frozen snapshot
  under concurrent writes.
- Erase batches default to 200; a batch above 500 is clamped to 500.
- `eraseBucket` returns only the rows deleted by that call. The ref stays
  reserved (`BUCKET_EXISTS`) until `get` returns `null`.
- `eraseSubject` schedules nothing. A return of `0` means no memberships were
  left at that moment, not a ban: the subject can join again.
- `lock`, `close` and `leave` return `false` and change nothing when the bucket
  is not in a state that allows them. `lock` only works on `open` buckets.
- `JoinResult.reason` is typed `string`; the values are listed above.
- There is no expiry timer, presence heartbeat or role model. Schedule `close`
  or `eraseBucket` yourself.
- The component does not read auth. Scopes are namespaces, not permissions.
- A wrong or missing scope raises no error: `get` returns `null`, `join` returns
  `missing`, and `eraseBucket` and `eraseSubject` return `0`.
- `listMembers(ctx, bucketRef, scope?, limit?)` takes `scope` before `limit`;
  pass `undefined` as the scope to keep the default.

## Compatibility

- Peer dependency: `convex@^1.45.0`. CI tests the package against convex 1.45.0
  and the current release.
- Node.js `>=20.19.0`. ES modules only.
- Node.js 22 or later for convex 1.50 and newer, which require it.
- `@vllnt/convex-buckets/test` needs `convex-test`, `vitest` and
  `@edge-runtime/vm`, with the Vitest config shown under Testing.
- React: not applicable. The package is backend-only and has no `./react` entry.

## Testing

Mount the component in your own `convex-test` suite with `register`. Vitest must
run in the edge runtime and transform this package, because the helper is
TypeScript source that uses `import.meta.glob`:

```ts
// vitest.config.mts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test", "@vllnt/convex-buckets"] } },
  },
});
```

```ts
// convex/lobby.test.ts
/// <reference types="vite/client" />
import { register } from "@vllnt/convex-buckets/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

test("the creator joins the new lobby", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.ts"));
  register(t);
  const player = t.withIdentity({ tokenIdentifier: "player-1" });
  const bucketRef = await player.mutation(api.lobby.createLobby, {});
  const again = await player.mutation(api.lobby.joinLobby, { bucketRef });
  expect(again).toEqual({ joined: false, reason: "already_member" });
});
```

`register(t, name)` takes the mount name when you used
`app.use(buckets, { name })`.

This repository's own tests use the simulated `convex-test` runtime
(`pnpm test:coverage`, 100% coverage enforced). `example/convex/actions.ts`
checks concurrent joins and scheduled cleanup on a real local backend:
`CONVEX_AGENT_MODE=anonymous pnpm convex dev --once --local-cloud-port 3330 --local-site-port 3331 --run actions:verify`
(run with an isolated `HOME`).

## Security

- The component does not authenticate. The host must authorize every call and
  derive scopes and subject refs itself; never accept a `subjectRef` from the
  client.
- Its tables are reachable only through the component's functions.
- Capacity is enforced by patching `memberCount` on the bucket document, so
  concurrent joins conflict and Convex retries them.

Report vulnerabilities as described in
[SECURITY.md](https://github.com/vllnt/convex-buckets/blob/main/SECURITY.md).

## Related packages

- [`@vllnt/convex-memberships`](https://oss.vllnt.com/packages/convex-memberships):
  standing memberships and roles (orgs, teams). Use it when the group outlives a
  session.
- [`@convex-dev/presence`](https://www.npmjs.com/package/@convex-dev/presence):
  who is online now. Buckets has no heartbeat.
- [`@vllnt/convex-invitations`](https://oss.vllnt.com/packages/convex-invitations):
  single-use, expiring invitations. Call `join` from the host after an
  invitation is accepted.

## Contributing

See
[CONTRIBUTING.md](https://github.com/vllnt/convex-buckets/blob/main/CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

[![npm](https://img.shields.io/npm/v/@vllnt/convex-buckets.svg)](https://www.npmjs.com/package/@vllnt/convex-buckets)
[![CI](https://github.com/vllnt/convex-buckets/actions/workflows/ci.yml/badge.svg)](https://github.com/vllnt/convex-buckets/actions/workflows/ci.yml)

Built by [bntvllnt](https://github.com/bntvllnt) ·
[bntvllnt.com](https://bntvllnt.com) · [X @bntvllnt](https://x.com/bntvllnt).
[Sponsor the work](https://github.com/sponsors/bntvllnt).

---

Part of [vllnt open source](https://oss.vllnt.com) · [Package page](https://oss.vllnt.com/packages/convex-buckets) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)
