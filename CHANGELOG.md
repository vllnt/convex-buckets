# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-11-28

Documentation and packaging only; nothing behaves differently. The component's
runtime code, the `convex@^1.45.0` peer range and the Node.js `>=20.19.0` range
are unchanged from 0.1.0. The compiled `dist` differs from 0.1.0 only by added
TSDoc comments.

### Added

- The package tells coding agents where its version-matched docs are:
  `node_modules/@vllnt/convex-buckets/`, with `docs/API.md`, `llms.txt`,
  `CHANGELOG.md` and the TypeScript `src/`. The README and `llms.txt` each have
  a "For coding agents" note.
- `docs/API.md` lists the import entry points and exported types, and states the
  Node.js `>=20.19.0` requirement, with Node.js 22 or later for convex 1.49 and
  newer. It has one heading per export and method, so the README links straight
  to each entry.
- Every public export, `Buckets` method and component function has a TSDoc
  summary; `Buckets` links its package page with `@see`.
- A README Links section lists the package page and release feed, the @vllnt
  package index and search, the source, issues and npm, Discord and X, the
  company and author, and sponsorship. The README ends with links to vllnt open
  source, the package page, vllnt.com and the author.
- The docs state the member order: `listMembers` and `paginateMembers` return
  members in membership creation order, so a member who leaves and joins again
  moves to the end.

### Changed

- The README follows the section layout shared by every @vllnt package: For
  coding agents, When to use, Install, Quick start, API, Common tasks, Errors
  and fixes, Limits and gotchas, Compatibility, then Testing, Security, Related
  packages, Contributing, Links and License. It has a table of every export and
  of every error code with its cause and fix.
- `llms.txt` links the files shipped in the package relatively (`./docs/API.md`,
  `./CHANGELOG.md`), so they match the installed version. It adds "When to use",
  links to the errors table, notes the Node.js 22 requirement of convex 1.49 and
  newer, and ends with an Ecosystem block: the package page, its release feed,
  the @vllnt package index, package and docs search, vllnt and the author.
- `package.json` `description` and `keywords` describe what the package does.
  The same description sentence opens the README and is the `llms.txt` summary.
  `homepage` points at `https://oss.vllnt.com/packages/convex-buckets`.
- The README Compatibility section lists `vite` with `convex-test`, `vitest` and
  `@edge-runtime/vm` for `@vllnt/convex-buckets/test`: the Testing example's
  `vite/client` types need `vite` as a direct dev dependency. On convex 1.45,
  use `convex-test` 0.0.71 or older; 0.0.72 and newer require `convex@^1.46.0`
  and fail strict `tsc` against convex 1.45.
- The README links `CONTRIBUTING.md` by absolute URL, because that file is not
  in the package. Related packages lists none: no other package works with this
  one in code through a dependency, a shared test or an example.
- Canary builds (`canary` dist-tag) now publish on every push to `main` that
  touches the package or its shipped docs.
- Internal only: more CI checks, behaviour tests and tooling, and a 7-day
  minimum release age for dependencies.

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
