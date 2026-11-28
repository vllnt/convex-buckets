import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import { register } from "../../src/test";

import { api, components } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const at256 = "x".repeat(256);
const at257 = "x".repeat(257);
/** Timeout for tests that build hundreds of rows one mutation at a time. */
const slow = 20_000;
const page = (size: number) => ({ cursor: null, numItems: size });
const names = (count: number) =>
  Array.from({ length: count }, (_, index) => `s${String(index)}`);

function setup() {
  const t = convexTest(schema, modules);
  register(t);
  return t;
}

type T = ReturnType<typeof setup>;

/** Runs `run` for each item, one after another, so writes commit in order. */
async function inOrder<TItem>(
  items: readonly TItem[],
  run: (item: TItem) => Promise<unknown>,
): Promise<void> {
  await items.reduce<Promise<unknown>>(
    (previous, item) => previous.then(() => run(item)),
    Promise.resolve(),
  );
}

async function fill(t: T, bucketRef: string, count: number): Promise<void> {
  await t.mutation(api.mutations.open, { bucketRef });
  await inOrder(names(count), (subjectRef) =>
    t.mutation(api.mutations.join, { bucketRef, subjectRef }),
  );
}

/** Holds scheduled erase batches until the test drains them, then drains the rest. */
async function withFakeTimers(run: (t: T) => Promise<void>): Promise<void> {
  vi.useFakeTimers();
  try {
    const t = setup();
    await run(t);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
}

test("a client's defaultScope is used for calls without a scope", async () => {
  const t = setup();
  await t.mutation(api.mutations.openTenant, { bucketRef: "m" });
  expect(
    await t.query(api.queries.get, { bucketRef: "m", scope: "tenant" }),
  ).toMatchObject({ status: "open" });
});

test("256-character refs and scopes are accepted", async () => {
  const t = setup();
  const ref = { bucketRef: at256, scope: at256 };
  expect(await t.mutation(api.mutations.open, ref)).toBe(at256);
  expect(
    await t.mutation(api.mutations.join, { ...ref, subjectRef: at256 }),
  ).toEqual({ joined: true });
  expect(await t.query(api.queries.get, ref)).toMatchObject({
    bucketRef: at256,
    memberCount: 1,
  });
  const listed = await t.query(api.queries.listMembers, ref);
  expect(listed.map((member) => member.subjectRef)).toEqual([at256]);
  const paged = await t.query(api.queries.paginateMembers, {
    ...ref,
    paginationOpts: page(10),
  });
  expect(paged.page.map((member) => member.subjectRef)).toEqual([at256]);
});

test("257-character refs throw INVALID_REF on every mutation", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  await Promise.all(
    [
      t.mutation(api.mutations.open, { bucketRef: at257 }),
      t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: at257 }),
      t.mutation(api.mutations.leave, { bucketRef: "m", subjectRef: at257 }),
      t.mutation(api.mutations.eraseSubject, { subjectRef: at257 }),
      t.mutation(api.mutations.lock, { bucketRef: at257 }),
      t.mutation(api.mutations.close, { bucketRef: at257 }),
      t.mutation(api.mutations.eraseBucket, { bucketRef: at257 }),
    ].map((call) => expect(call).rejects.toThrow("INVALID_REF")),
  );
});

test("an empty scope throws INVALID_REF on every method", async () => {
  const t = setup();
  const ref = { bucketRef: "m", scope: "" };
  const member = { ...ref, subjectRef: "a" };
  await Promise.all(
    [
      t.mutation(api.mutations.join, member),
      t.mutation(api.mutations.leave, member),
      t.mutation(api.mutations.lock, ref),
      t.mutation(api.mutations.close, ref),
      t.mutation(api.mutations.eraseBucket, ref),
      t.mutation(api.mutations.eraseSubject, { scope: "", subjectRef: "a" }),
      t.query(api.queries.get, ref),
      t.query(api.queries.paginateMembers, { ...ref, paginationOpts: page(1) }),
    ].map((call) => expect(call).rejects.toThrow("INVALID_REF")),
  );
});

test("a closed bucket keeps its ref until eraseBucket finishes", async () => {
  await withFakeTimers(async (t) => {
    const ref = { bucketRef: "m" };
    await t.mutation(api.mutations.open, ref);
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
    expect(await t.mutation(api.mutations.close, ref)).toBe(true);
    await expect(t.mutation(api.mutations.open, ref)).rejects.toThrow(
      "BUCKET_EXISTS",
    );
    expect(
      await t.mutation(api.mutations.eraseBucket, { ...ref, batch: 1 }),
    ).toBe(1);
    await expect(t.mutation(api.mutations.open, ref)).rejects.toThrow(
      "BUCKET_EXISTS",
    );
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.queries.get, ref)).toBeNull();
    expect(await t.mutation(api.mutations.open, ref)).toBe("m");
  });
});

test("scopes are separate, generated refs differ, no capacity means no limit", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m", scope: "s1" });
  await t.mutation(api.mutations.open, { bucketRef: "m", scope: "s2" });
  expect(
    await t.query(api.queries.get, { bucketRef: "m", scope: "s1" }),
  ).toMatchObject({ status: "open" });
  expect(
    await t.query(api.queries.get, { bucketRef: "m", scope: "s2" }),
  ).toMatchObject({ status: "open" });
  const first = await t.mutation(api.mutations.open, {});
  const second = await t.mutation(api.mutations.open, {});
  expect(first).not.toBe(second);
  const state = await t.query(api.queries.get, { bucketRef: first });
  expect(state?.capacity).toBeUndefined();
  const results: unknown[] = [];
  await inOrder(["a", "b", "c"], async (subjectRef) => {
    results.push(
      await t.mutation(api.mutations.join, { bucketRef: first, subjectRef }),
    );
  });
  expect(results).toEqual([
    { joined: true },
    { joined: true },
    { joined: true },
  ]);
});

test("leaving frees a capacity slot", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m", capacity: 1 });
  const join = (subjectRef: string) =>
    t.mutation(api.mutations.join, { bucketRef: "m", subjectRef });
  expect(await join("a")).toEqual({ joined: true });
  expect(await join("b")).toEqual({ joined: false, reason: "full" });
  expect(
    await t.mutation(api.mutations.leave, { bucketRef: "m", subjectRef: "a" }),
  ).toBe(true);
  expect(await t.query(api.queries.get, { bucketRef: "m" })).toMatchObject({
    memberCount: 0,
  });
  expect(await join("b")).toEqual({ joined: true });
});

test("lock and close set timestamps; lock on a closed bucket is false", async () => {
  const t = setup();
  const ref = { bucketRef: "m" };
  await t.mutation(api.mutations.open, ref);
  await t.mutation(api.mutations.lock, ref);
  const locked = await t.query(api.queries.get, ref);
  expect(locked?.lockedAt).toEqual(expect.any(Number));
  await t.mutation(api.mutations.close, ref);
  const closed = await t.query(api.queries.get, ref);
  expect(closed?.closedAt).toEqual(expect.any(Number));
  expect(await t.mutation(api.mutations.lock, ref)).toBe(false);
});

test(
  "listMembers defaults to 100 and clamps to 500; numItems 500 is accepted",
  { timeout: slow },
  async () => {
    const t = setup();
    await fill(t, "m", 501);
    const ref = { bucketRef: "m" };
    expect(await t.query(api.queries.listMembers, ref)).toHaveLength(100);
    expect(
      await t.query(api.queries.listMembers, { ...ref, limit: 600 }),
    ).toHaveLength(500);
    const paged = await t.query(api.queries.paginateMembers, {
      ...ref,
      paginationOpts: page(500),
    });
    expect(paged.page).toHaveLength(500);
    expect(paged.isDone).toBe(false);
  },
);

test("members are ordered by membership creation; a rejoin moves to the end", async () => {
  const t = setup();
  const ref = { bucketRef: "m" };
  await t.mutation(api.mutations.open, ref);
  await inOrder(["c", "a", "b"], (subjectRef) =>
    t.mutation(api.mutations.join, { ...ref, subjectRef }),
  );
  await t.mutation(api.mutations.leave, { ...ref, subjectRef: "a" });
  await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
  const listed = await t.query(api.queries.listMembers, ref);
  const paged = await t.query(api.queries.paginateMembers, {
    ...ref,
    paginationOpts: page(10),
  });
  expect(listed.map((member) => member.subjectRef)).toEqual(["c", "b", "a"]);
  expect(paged.page.map((member) => member.subjectRef)).toEqual([
    "c",
    "b",
    "a",
  ]);
});

test("eraseBucket finishes in scheduled batches and leaves no rows", async () => {
  await withFakeTimers(async (t) => {
    await fill(t, "m", 5);
    const ref = { bucketRef: "m" };
    expect(
      await t.mutation(api.mutations.eraseBucket, { ...ref, batch: 2 }),
    ).toBe(2);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.queries.get, ref)).toBeNull();
    expect(await t.query(api.queries.listMembers, ref)).toEqual([]);
    const left = await Promise.all(
      names(5).map((subjectRef) =>
        t.mutation(api.mutations.eraseSubject, { subjectRef }),
      ),
    );
    expect(left).toEqual([0, 0, 0, 0, 0]);
  });
});

test("eraseBucket batch defaults to 200", { timeout: slow }, async () => {
  await withFakeTimers(async (t) => {
    await fill(t, "m", 201);
    expect(
      await t.mutation(api.mutations.eraseBucket, { bucketRef: "m" }),
    ).toBe(200);
  });
});

test("eraseBucket batch clamps to 500", { timeout: slow }, async () => {
  await withFakeTimers(async (t) => {
    await fill(t, "m", 501);
    expect(
      await t.mutation(api.mutations.eraseBucket, {
        batch: 600,
        bucketRef: "m",
      }),
    ).toBe(500);
  });
});

test("eraseSubject batch defaults to 200", { timeout: slow }, async () => {
  const t = setup();
  await inOrder(names(201), async (bucketRef) => {
    await t.mutation(api.mutations.open, { bucketRef });
    await t.mutation(api.mutations.join, { bucketRef, subjectRef: "a" });
  });
  expect(
    await t.mutation(api.mutations.eraseSubject, { subjectRef: "a" }),
  ).toBe(200);
  expect(
    await t.mutation(api.mutations.eraseSubject, { subjectRef: "a" }),
  ).toBe(1);
});

test("eraseBucket keeps the original closedAt while rows remain", async () => {
  await withFakeTimers(async (t) => {
    vi.setSystemTime(1000);
    await fill(t, "m", 3);
    const ref = { bucketRef: "m" };
    await t.mutation(api.mutations.close, ref);
    const closed = await t.query(api.queries.get, ref);
    const closedAt = closed?.closedAt;
    expect(closedAt).toBeLessThan(5000);
    vi.setSystemTime(5000);
    expect(
      await t.mutation(api.mutations.eraseBucket, { ...ref, batch: 1 }),
    ).toBe(1);
    expect(await t.query(api.queries.get, ref)).toMatchObject({
      closedAt,
      memberCount: 2,
      status: "closed",
    });
  });
});

test("eraseSubject counts only the given scope", async () => {
  const t = setup();
  const other = { bucketRef: "m1", scope: "t" };
  const memberships = [
    { bucketRef: "m1", scope: "s" },
    { bucketRef: "m2", scope: "s" },
    other,
  ];
  await inOrder(memberships, async (ref) => {
    await t.mutation(api.mutations.open, ref);
    await t.mutation(api.mutations.join, { ...ref, subjectRef: "a" });
  });
  const erase = (scope: string) =>
    t.mutation(api.mutations.eraseSubject, { scope, subjectRef: "a" });
  expect(await erase("s")).toBe(2);
  const counts = await Promise.all(
    memberships.map(async (ref) => {
      const state = await t.query(api.queries.get, ref);
      return state?.memberCount;
    }),
  );
  expect(counts).toEqual([0, 0, 1]);
  const kept = await t.query(api.queries.listMembers, other);
  expect(kept.map((member) => member.subjectRef)).toEqual(["a"]);
  expect(await erase("u")).toBe(0);
});

const wrongScope = { bucketRef: "m", scope: "nope" };

/** Bucket `m` with member `a` in the default scope. */
async function defaultScopeMember(): Promise<T> {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" });
  return t;
}

test("a wrong scope: writes act on a missing bucket", async () => {
  const t = await defaultScopeMember();
  const subject = { scope: "nope", subjectRef: "a" };
  expect(
    await t.mutation(api.mutations.join, { ...wrongScope, subjectRef: "b" }),
  ).toEqual({ joined: false, reason: "missing" });
  const results = [
    await t.mutation(api.mutations.leave, { ...wrongScope, ...subject }),
    await t.mutation(api.mutations.lock, wrongScope),
    await t.mutation(api.mutations.close, wrongScope),
    await t.mutation(api.mutations.eraseBucket, wrongScope),
    await t.mutation(api.mutations.eraseSubject, subject),
  ];
  expect(results).toEqual([false, false, false, 0, 0]);
  expect(await t.query(api.queries.get, { bucketRef: "m" })).toMatchObject({
    memberCount: 1,
    status: "open",
  });
});

test("a wrong scope: reads return no members", async () => {
  const t = await defaultScopeMember();
  expect(await t.query(api.queries.listMembers, wrongScope)).toEqual([]);
  const paged = await t.query(api.queries.paginateMembers, {
    ...wrongScope,
    paginationOpts: page(10),
  });
  expect(paged.page).toEqual([]);
});

test("named mounts are isolated, including scheduled erase", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    register(t);
    register(t, "isolated");
    const ref = { bucketRef: "m", scope: "global" };
    await t.mutation(api.mutations.open, { bucketRef: "m" });
    await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" });
    await t.run(async (ctx) => {
      await ctx.runMutation(components.isolated.mutations.open, ref);
      await ctx.runMutation(components.isolated.mutations.join, {
        ...ref,
        subjectRef: "a",
      });
    });
    await t.mutation(api.mutations.eraseBucket, { batch: 1, bucketRef: "m" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.queries.get, { bucketRef: "m" })).toBeNull();
    const isolated = await t.run((ctx) =>
      ctx.runQuery(components.isolated.queries.listMembers, ref),
    );
    expect(isolated.map((member) => member.subjectRef)).toEqual(["a"]);
  } finally {
    vi.useRealTimers();
  }
});
