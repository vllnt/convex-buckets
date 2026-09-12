import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageText = readFileSync("package.json", "utf8");
const workflow = readFileSync(".github/workflows/publish.yml", "utf8");
const contributing = readFileSync("CONTRIBUTING.md", "utf8");
assert.doesNotMatch(packageText, /"(?:alpha|release)"\s*:/u);
assert.doesNotMatch(workflow, /inputs\.bump|git commit|git push origin main/u);
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
assert.match(workflow, /vars\.RELEASE_ENABLED == 'true'/u);
assert.match(workflow, /cancel-in-progress: false/u);
assert.match(workflow, /--notes "\$RELEASE_NOTES"/u);
assert.doesNotMatch(
  contributing,
  /pnpm (?:alpha|release)|for patch\/minor\/major/u,
);
