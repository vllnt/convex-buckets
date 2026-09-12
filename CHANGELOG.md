# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial unpublished preview of `@vllnt/convex-buckets`.
- Cursor pagination via `paginateMembers` and targeted real local backend
  checks.

### Fixed

- Close and recount buckets atomically during erasure; fence scheduled batches
  by document ID.
- Safely remove orphan subject memberships; reject unsafe integer capacities.

### Preview surface

- `open`, `join`, `leave`, `lock`, `close`, `get`, `listMembers` (bounded),
  `eraseBucket` / `eraseSubject` (batched).
- OCC-safe `memberCount` on the bucket row.
