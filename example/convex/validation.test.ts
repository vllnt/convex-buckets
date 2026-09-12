import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "../../src/component/_generated/api";
import schema from "../../src/component/schema";
const modules = import.meta.glob("../../src/component/**/*.ts");

test.each(["", "x".repeat(257)])(
  "all query refs and mutation scopes reject invalid ref %s",
  async (invalid) => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.queries.get, { bucketRef: invalid, scope: "s" }),
    ).rejects.toThrow("INVALID_REF");
    await expect(
      t.query(api.queries.listMembers, { bucketRef: "b", scope: invalid }),
    ).rejects.toThrow("INVALID_REF");
    await expect(
      t.query(api.queries.paginateMembers, {
        bucketRef: invalid,
        // eslint-disable-next-line unicorn/no-null -- Convex serializes null; undefined is not a valid cursor/result.
        paginationOpts: { cursor: null, numItems: 1 },
        scope: "s",
      }),
    ).rejects.toThrow("INVALID_REF");
    await expect(
      t.mutation(api.mutations.open, { bucketRef: "b", scope: invalid }),
    ).rejects.toThrow("INVALID_REF");
  },
);

test("subject batches leave no scheduled work that could erase recreation", async () => {
  const t = convexTest(schema, modules);
  const ref = { bucketRef: "b", scope: "s" };
  await t.mutation(api.mutations.open, ref);
  await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
  expect(
    await t.mutation(api.mutations.eraseSubject, {
      batch: 1,
      scope: "s",
      subjectRef: "a",
    }),
  ).toBe(1);
  expect(
    await t.mutation(api.mutations.eraseSubject, {
      scope: "s",
      subjectRef: "a",
    }),
  ).toBe(0);
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  ).toEqual([]);
  await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
  const recreated = await t.query(api.queries.get, ref);
  expect(recreated?.memberCount).toBe(1);
});
