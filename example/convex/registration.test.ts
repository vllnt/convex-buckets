import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import { register } from "../../src/test";

const hostSchema = defineSchema({
  unrelated: defineTable({ label: v.string() }),
});
const modules = import.meta.glob("./**/*.ts");

test("registration accepts unrelated host schemas and named mounts", async () => {
  const t = convexTest(hostSchema, modules);
  const registration = vi.spyOn(t, "registerComponent");
  expect(() => {
    register(t, "first");
  }).not.toThrow();
  expect(() => {
    register(t, "second");
  }).not.toThrow();
  const registeredModules = registration.mock.calls[0]?.[2];
  if (!registeredModules) throw new Error("missing registered modules");
  await Promise.all(Object.values(registeredModules).map((load) => load()));
});
