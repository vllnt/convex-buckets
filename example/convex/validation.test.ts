import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

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

test("subject sweep is not a ban: recreation after completion survives", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    const ref = { bucketRef: "b", scope: "s" };
    await t.mutation(api.mutations.open, ref);
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
    await t.mutation(api.mutations.eraseSubject, {
      batch: 1,
      scope: "s",
      subjectRef: "a",
    });
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const erased = await t.query(api.queries.get, ref);
    expect(erased?.memberCount).toBe(0);
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
    const recreated = await t.query(api.queries.get, ref);
    expect(recreated?.memberCount).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});
