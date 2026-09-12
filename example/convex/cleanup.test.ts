import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import { api, internal } from "../../src/component/_generated/api";
import schema from "../../src/component/schema";
const modules = import.meta.glob("../../src/component/**/*.ts");
const ref = { bucketRef: "b", scope: "s" };

async function populated() {
  const t = convexTest(schema, modules);
  await t.mutation(api.mutations.open, ref);
  await Promise.all(
    ["a", "b", "c"].map((subjectRef) =>
      t.mutation(api.mutations.join, { ...ref, subjectRef }),
    ),
  );
  return t;
}

test("cleanup closes immediately and counts remaining rows", async () => {
  vi.useFakeTimers();
  try {
    const t = await populated();
    expect(
      await t.mutation(api.mutations.eraseBucket, { ...ref, batch: 1 }),
    ).toBe(1);
    expect(await t.query(api.queries.get, ref)).toMatchObject({
      memberCount: 2,
      status: "closed",
    });
    expect(
      await t.mutation(api.mutations.join, { ...ref, subjectRef: "d" }),
    ).toEqual({ joined: false, reason: "closed" });
    await expect(t.mutation(api.mutations.open, ref)).rejects.toThrow();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
});

test("stale jobs cannot cross deletion generations", async () => {
  vi.useFakeTimers();
  try {
    const t = await populated();
    const id = await t.run(async (ctx) => {
      const bucket = await ctx.db.query("buckets").unique();
      if (!bucket) throw new Error("fixture missing");
      return bucket._id;
    });
    await t.mutation(api.mutations.eraseBucket, { ...ref, batch: 1 });
    await t.mutation(api.mutations.eraseBucket, ref);
    await t.mutation(api.mutations.open, ref);
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "new" });
    expect(
      await t.mutation(internal.mutations.continueEraseBucket, {
        batch: 1,
        bucketId: id,
      }),
    ).toBe(0);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.queries.get, ref)).toMatchObject({
      memberCount: 1,
      status: "open",
    });
  } finally {
    vi.useRealTimers();
  }
});

test("subject cleanup tolerates orphan rows", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("members", {
      bucketRef: "orphan",
      joinedAt: 0,
      scope: "s",
      subjectRef: "a",
    });
  });
  expect(
    await t.mutation(api.mutations.eraseSubject, {
      scope: "s",
      subjectRef: "a",
    }),
  ).toBe(1);
});

test("pagination traverses every member", async () => {
  const t = await populated();
  const first = await t.query(api.queries.paginateMembers, {
    ...ref,
    // eslint-disable-next-line unicorn/no-null -- Convex requires null for the first cursor.
    paginationOpts: { cursor: null, numItems: 2 },
  });
  const last = await t.query(api.queries.paginateMembers, {
    ...ref,
    paginationOpts: { cursor: first.continueCursor, numItems: 2 },
  });
  expect(first.isDone).toBe(false);
  expect(last.isDone).toBe(true);
  expect(
    [...first.page, ...last.page].map((member) => member.subjectRef),
  ).toEqual(["a", "b", "c"]);
});

test.each([0, 1.5, 501])(
  "rejects invalid page size %s",
  async (numberItems) => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.queries.paginateMembers, {
        ...ref,
        // eslint-disable-next-line unicorn/no-null -- Convex requires null for the first cursor.
        paginationOpts: { cursor: null, numItems: numberItems },
      }),
    ).rejects.toThrow("INVALID_LIMIT");
  },
);

test("rejects unsafe capacity", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.mutations.open, {
      capacity: Number.MAX_SAFE_INTEGER + 1,
      scope: "s",
    }),
  ).rejects.toThrow("INVALID_CAPACITY");
});
