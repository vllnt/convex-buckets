import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), "buckets-consumer-"));
/** @param {string} command @param {string[]} arguments_ @param {string} [cwd] */
const run = (command, arguments_, cwd = temporary) =>
  execFileSync(command, arguments_, { cwd, stdio: "inherit" });
try {
  run("pnpm", ["pack", "--pack-destination", temporary], root);
  writeFileSync(
    join(temporary, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run("pnpm", [
    "add",
    join(temporary, "vllnt-convex-buckets-0.1.0.tgz"),
    "convex@1.45.0",
    "typescript@5.9.3",
    "convex-test@0.0.56",
    "vite@8.2.2",
    "@types/node@22.20.2",
  ]);
  writeFileSync(
    join(temporary, "consumer.ts"),
    `
import { Buckets } from "@vllnt/convex-buckets";
import type { ComponentApi } from "@vllnt/convex-buckets/_generated/component.js";
import config from "@vllnt/convex-buckets/convex.config.js";
import { defineApp } from "convex/server";
declare const component: ComponentApi;
const client = new Buckets(component);
const app = defineApp(); app.use(config);
void client; void app;
`,
  );
  run("pnpm", [
    "exec",
    "tsc",
    "--noEmit",
    "--strict",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "ES2022",
    "consumer.ts",
  ]);
  writeFileSync(
    join(temporary, "registration.ts"),
    `
import { register } from "@vllnt/convex-buckets/test";
import { convexTest } from "convex-test";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
const host = defineSchema({ unrelated: defineTable({ label: v.string() }) });
register(convexTest(host, {}), "custom");
`,
  );
  run("pnpm", [
    "exec",
    "tsc",
    "--noEmit",
    "--strict",
    "--module",
    "ESNext",
    "--moduleResolution",
    "Bundler",
    "--target",
    "ES2022",
    "--types",
    "vite/client,node",
    "registration.ts",
  ]);
  run("node", [
    "--input-type=module",
    "-e",
    'import { Buckets } from "@vllnt/convex-buckets"; import config from "@vllnt/convex-buckets/convex.config.js"; if (!Buckets || !config) throw Error("missing export");',
  ]);
} finally {
  rmSync(temporary, { force: true, recursive: true });
}
