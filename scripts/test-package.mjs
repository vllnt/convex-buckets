import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "buckets-consumer-"));
const run = (command, args, cwd = temp) => execFileSync(command, args, { cwd, stdio: "inherit" });
try {
  run("pnpm", ["pack", "--pack-destination", temp], root);
  writeFileSync(join(temp, "package.json"), JSON.stringify({ private: true, type: "module" }));
  run("pnpm", ["add", join(temp, "vllnt-convex-buckets-0.1.0.tgz"), "convex@1.45.0", "typescript@5.9.3"]);
  writeFileSync(join(temp, "consumer.ts"), `
import { Buckets } from "@vllnt/convex-buckets";
import type { ComponentApi } from "@vllnt/convex-buckets/_generated/component.js";
import config from "@vllnt/convex-buckets/convex.config.js";
import { defineApp } from "convex/server";
declare const component: ComponentApi;
const client = new Buckets(component);
const app = defineApp(); app.use(config);
void client; void app;
`);
  run("pnpm", ["exec", "tsc", "--noEmit", "--strict", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "consumer.ts"]);
  run("node", ["--input-type=module", "-e", 'import { Buckets } from "@vllnt/convex-buckets"; import config from "@vllnt/convex-buckets/convex.config.js"; if (!Buckets || !config) throw Error("missing export");']);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
