import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Preserve existing automation; maintain llms.txt by hand instead of bundling source.
// Shipped files use ./ links so they match the installed version.
const index = readFileSync("llms.txt", "utf8");
assert.ok(index.startsWith("# @vllnt/convex-buckets\n"));
assert.deepEqual(
  [
    "[README](./README.md)",
    "[API Reference](./docs/API.md)",
    "[Changelog](./CHANGELOG.md)",
    "[License](./LICENSE)",
    "](https://oss.vllnt.com/llms.txt)",
  ].filter((link) => !index.includes(link)),
  [],
  "llms.txt is missing required links",
);
assert.ok(index.includes("## For coding agents\n"));
assert.ok(index.includes("`node_modules/@vllnt/convex-buckets/docs/`"));
assert.doesNotMatch(
  index,
  /blob\/main\/(?:README\.md|docs\/|CHANGELOG\.md|LICENSE)/u,
  "link shipped files with ./ paths, not GitHub main",
);
