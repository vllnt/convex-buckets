import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import schema from "../../src/component/schema";
import { api, internal } from "../../src/component/_generated/api";

const modules = import.meta.glob("../../src/component/**/*.ts");

test("bucket cleanup closes immediately, counts remaining rows, and fences stale jobs", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    const ref = { scope: "s", bucketRef: "b" };
    await t.mutation(api.mutations.open, ref);
    const id = await t.run(
      async (ctx) => (await ctx.db.query("buckets").unique())!._id,
    );
    for (const subjectRef of ["a", "b", "c"])
      await t.mutation(api.mutations.join, { ...ref, subjectRef });
    expect(
      await t.mutation(api.mutations.eraseBucket, { ...ref, batch: 1 }),
    ).toBe(1);
    expect(await t.query(api.queries.get, ref)).toMatchObject({
      status: "closed",
      memberCount: 2,
    });
    expect(
      await t.mutation(api.mutations.join, { ...ref, subjectRef: "d" }),
    ).toEqual({ joined: false, reason: "closed" });
    await expect(t.mutation(api.mutations.open, ref)).rejects.toThrow();
    await t.mutation(api.mutations.eraseBucket, ref);
    await t.mutation(api.mutations.open, ref);
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "new" });
    expect(
      await t.mutation(internal.mutations.continueEraseBucket, {
        bucketId: id,
        batch: 1,
      }),
    ).toBe(0);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.queries.get, ref)).toMatchObject({
      status: "open",
      memberCount: 1,
    });
  } finally {
    vi.useRealTimers();
  }
});

test("subject cleanup tolerates orphan rows", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("members", {
      scope: "s",
      bucketRef: "orphan",
      subjectRef: "a",
      joinedAt: 0,
    });
  });
  expect(
    await t.mutation(api.mutations.eraseSubject, {
      scope: "s",
      subjectRef: "a",
    }),
  ).toBe(1);
});

test("pagination traverses every member and validates page sizes", async () => {
  const t = convexTest(schema, modules);
  const ref = { scope: "s", bucketRef: "b" };
  await t.mutation(api.mutations.open, ref);
  for (const subjectRef of ["a", "b", "c"])
    await t.mutation(api.mutations.join, { ...ref, subjectRef });
  const first = await t.query(api.queries.paginateMembers, {
    ...ref,
    paginationOpts: { cursor: null, numItems: 2 },
  });
  const last = await t.query(api.queries.paginateMembers, {
    ...ref,
    paginationOpts: { cursor: first.continueCursor, numItems: 2 },
  });
  expect(first.isDone).toBe(false);
  expect(last.isDone).toBe(true);
  expect([...first.page, ...last.page].map((m) => m.subjectRef)).toEqual([
    "a",
    "b",
    "c",
  ]);
  for (const numItems of [0, 1.5, 501])
    await expect(
      t.query(api.queries.paginateMembers, {
        ...ref,
        paginationOpts: { cursor: null, numItems },
      }),
    ).rejects.toThrow("INVALID_LIMIT");
  await expect(
    t.mutation(api.mutations.open, {
      scope: "s",
      capacity: Number.MAX_SAFE_INTEGER + 1,
    }),
  ).rejects.toThrow("INVALID_CAPACITY");
});
