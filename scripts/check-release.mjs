import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageText = readFileSync("package.json", "utf8");
const workflow = readFileSync(".github/workflows/publish.yml", "utf8");
const contributing = readFileSync("CONTRIBUTING.md", "utf8");
assert.doesNotMatch(
  packageText,
  /"(?:alpha|release|prepublishOnly|canary:first)"\s*:|npm publish/u,
);
assert.doesNotMatch(workflow, /inputs\.bump|git commit|git push origin main/u);
assert.match(workflow, /tags: \["v\*\.\*\.\*"\]/u);
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
assert.match(workflow, /--provenance/u);
assert.match(workflow, /cancel-in-progress: false/u);
assert.doesNotMatch(workflow, /_authToken\s*=|NPM_TOKEN/u);
assert.doesNotMatch(
  contributing,
  /pnpm (?:alpha|release)|for patch\/minor\/major/u,
);
