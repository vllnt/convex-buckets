import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Preserve existing automation; maintain llms.txt by hand instead of bundling source.
const index = readFileSync("llms.txt", "utf8");
assert.ok(index.startsWith("# @vllnt/convex-buckets\n"));
assert.ok(
  index.includes(
    "[README](https://github.com/vllnt/convex-buckets/blob/main/README.md)",
  ),
);
assert.ok(
  index.includes(
    "[API Reference](https://github.com/vllnt/convex-buckets/blob/main/docs/API.md)",
  ),
);
