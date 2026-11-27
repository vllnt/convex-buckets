/// <reference types="vite/client" />

import type { GenericSchema, SchemaDefinition } from "convex/server";
import type { TestConvex } from "convex-test";

import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");

/**
 * Mounts the component in a `convex-test` instance under `name` (default
 * `"buckets"`, the name used by `app.use(config)`). Needs Vite's
 * `import.meta.glob`, so run it under Vitest.
 */
export function register<TSchema extends GenericSchema>(
  t: TestConvex<SchemaDefinition<TSchema, boolean>>,
  name = "buckets",
): void {
  t.registerComponent(name, schema, modules);
}
