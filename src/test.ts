import type { TestConvex } from "convex-test";
import schema from "./component/schema";

const modules = import.meta.glob("./component/**/*.ts");

export function register(t: TestConvex<typeof schema>, name = "buckets"): void {
  t.registerComponent(name, schema, modules);
}
