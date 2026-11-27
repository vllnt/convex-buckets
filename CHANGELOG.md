# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- The README follows the section layout shared by every @vllnt package: For
  coding agents, When to use, Install, Quick start, API, Common tasks, Errors and
  fixes, Limits and gotchas, Compatibility, then Testing, Security, Related
  packages, Contributing and License. It has a table of every export and of
  every error code with its cause and fix.
- `docs/API.md` has one heading per export and method, so the README links
  straight to each entry.
- `llms.txt` adds "When to use", links to the errors table, and an Ecosystem
  block.
- Every public export, `Buckets` method and component function has a TSDoc
  summary; `Buckets` links its package page with `@see`.
- `package.json` `description` and `keywords` describe what the package does.
- The README ends with links to the package page, vllnt open source, vllnt.com
  and the author, and related @vllnt packages link their package pages.

## [0.1.1] - 2026-11-27

Documentation and packaging only. The component code, the compiled `dist` and
the `convex@^1.45.0` peer range are unchanged from 0.1.0.

### Documentation

- The package now tells coding agents where its version-matched docs are:
  `node_modules/@vllnt/convex-buckets/docs/`, with `llms.txt` and this
  changelog. `llms.txt` and the README each have a "For coding agents" note.
- `llms.txt` links the files shipped in the package relatively (`./docs/API.md`,
  `./CHANGELOG.md`), so they match the installed version, and adds an Ecosystem
  link to `https://oss.vllnt.com/llms.txt`.
- `docs/API.md` lists the import entry points and exported types, states the
  Node.js `>=20.19.0` requirement, and names `BUCKET_EXISTS` with the other
  error codes.
- The README links `CONTRIBUTING.md` by absolute URL, because that file is not
  in the package.
- The README has a "Related packages" section, and `homepage` points at
  `https://oss.vllnt.com/packages/convex-buckets`.

### Release process

- Canary builds now publish on every push to `main` that touches the package or
  its shipped docs.

## [0.1.0] - 2026-11-23

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
