/// <reference types="vite/client" />

import type { GenericSchema, SchemaDefinition } from "convex/server";
import type { TestConvex } from "convex-test";

import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");

export function register<TSchema extends GenericSchema>(
  t: TestConvex<SchemaDefinition<TSchema, boolean>>,
  name = "buckets",
): void {
  t.registerComponent(name, schema, modules);
}
