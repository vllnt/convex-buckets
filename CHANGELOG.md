# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

First stable release. Earlier builds were published only under the `canary`
dist-tag (`0.1.0-canary.*`).

### What you get

- A Convex component for ephemeral groups of opaque `subjectRef`s (matches,
  lobbies, cohorts), mounted with `app.use(bucketsConfig)`. Named mounts are
  isolated from each other, including scheduled cleanup.
- Lifecycle `open` → `locked` (no new joins) → `closed` (terminal), through the
  `Buckets` client: `open`, `join`, `leave`, `lock`, `close`, `get`,
  `listMembers`, `paginateMembers`, `eraseBucket`, `eraseSubject`.
- Capacity enforced on the bucket row (`memberCount`), so concurrent joins retry
  instead of overfilling. `join` returns `{ joined: true }` or
  `{ joined: false, reason }` with `missing`, `locked`, `closed`,
  `already_member` or `full`.
- `listMembers` is a bounded preview (default 100, max 500) and does not signal
  truncation; `paginateMembers` traverses every member with a cursor (`numItems`
  1..500).
- `@vllnt/convex-buckets/test` exports `register` for `convex-test`.
- Every component function validates its arguments and return value. Refs and
  scopes must be 1..256 characters, including on reads.

### Errors

Invalid input throws a `ConvexError` whose `data` is `{ code, message }`:
`INVALID_REF`, `INVALID_CAPACITY` (non-positive or unsafe integer),
`INVALID_BATCH`, `INVALID_LIMIT` (also invalid pagination `numItems`) and
`BUCKET_EXISTS` (a supplied `bucketRef` is already in use in the scope).

### Erasure semantics

- `eraseBucket` closes the bucket and recounts it in the first transaction,
  deletes members in bounded batches (default 200, max 500) and reschedules
  itself by document ID, so a stale job can never remove a replacement bucket.
  The ref stays reserved until cleanup finishes; observe completion with `get`
  returning `null`.
- `eraseSubject` deletes one caller-driven batch per call and schedules nothing.
  Block new joins, repeat until it returns zero, then allow joins again. Zero is
  an observation, not a permanent ban; no latent subject job can remove a later
  rejoin.
