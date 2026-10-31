# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

First stable release. Earlier builds were published only under the `canary`
dist-tag (`0.1.0-canary.*`).

### Added

- `open`, `join`, `leave`, `lock`, `close`, `get`, `listMembers` (bounded),
  `paginateMembers` (cursor pagination), `eraseBucket` / `eraseSubject`
  (batched).
- OCC-safe `memberCount` on the bucket row, so capacity holds under concurrent
  joins.
- `@vllnt/convex-buckets/test` helper (`register`) for `convex-test`.

### Fixed

- Close and recount buckets atomically during erasure; fence scheduled batches
  by document ID.
- Safely remove orphan subject memberships; reject unsafe integer capacities.
- The `/test` entry now type-checks for `nodenext` consumers (explicit `.js`
  extensions on relative imports and a `vite/client` reference).

### Changed

- `eraseSubject` deletes one caller-driven batch, without scheduling future
  sweeps. Drain under a host write fence until zero; no timestamp-ordering
  assumption or latent subject job can affect subsequent rejoining.
