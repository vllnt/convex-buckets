import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
/** @type {unknown} */
const metadata = JSON.parse(readFileSync("package.json", "utf8"));
if (
  typeof metadata !== "object" ||
  metadata === null ||
  !("name" in metadata) ||
  !("version" in metadata) ||
  typeof metadata.name !== "string" ||
  typeof metadata.version !== "string"
)
  throw new Error("invalid package metadata");
const tarball = `${metadata.name.replace("@", "").replace("/", "-")}-${metadata.version}.tgz`;
const temporary = mkdtempSync(join(tmpdir(), "buckets-consumer-"));
/** @param {string} command @param {string[]} arguments_ @param {string} [cwd] */
const run = (command, arguments_, cwd = temporary) =>
  execFileSync(command, arguments_, { cwd, stdio: "inherit" });
try {
  run("pnpm", ["pack", "--pack-destination", temporary], root);
  writeFileSync(
    join(temporary, "package.json"),
    JSON.stringify({
      pnpm: { ignoredBuiltDependencies: ["esbuild"] },
      private: true,
      type: "module",
    }),
  );
  // pnpm 11 reads the build-script policy from the workspace file, pnpm 10 from package.json.
  writeFileSync(
    join(temporary, "pnpm-workspace.yaml"),
    "allowBuilds:\n  esbuild: false\n",
  );
  run("pnpm", [
    "add",
    join(temporary, tarball),
    "convex@1.45.0",
    "typescript@5.9.3",
    "convex-test@0.0.56",
    "vite@8.2.2",
    "@types/node@22.20.2",
  ]);
  // Agents read the bundled docs from node_modules, so they must ship and resolve.
  const installed = join(temporary, "node_modules", metadata.name);
  const docs = readdirSync(join(root, "docs")).map((file) => `docs/${file}`);
  for (const file of [
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "llms.txt",
    ...docs,
  ])
    if (!existsSync(join(installed, file)))
      throw new Error(`tarball is missing ${file}`);
  for (const file of ["README.md", "llms.txt"])
    for (const [, link] of readFileSync(join(installed, file), "utf8").matchAll(
      /\]\((?!https?:|#)([^)\s#]+)/gu,
    ))
      if (!existsSync(join(installed, link)))
        throw new Error(`${file} link ${link} is not in the tarball`);
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
  // The shipped test helper is TypeScript source: it must also compile for NodeNext consumers.
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
    "--types",
    "node",
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
