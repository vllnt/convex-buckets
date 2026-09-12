import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import {
  clampEraseBatch,
  clampListLimit,
  MAX_ERASE_BATCH,
  MAX_LIST_LIMIT,
} from "../../src/shared";
import { register } from "../../src/test";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  register(t);
  return t;
}

test("open generates a ref and join/list/get work", async () => {
  const t = setup();
  const ref = await t.mutation(api.mutations.open, { capacity: 2 });
  expect(ref.length).toBeGreaterThan(0);
  expect(
    await t.mutation(api.mutations.join, { bucketRef: ref, subjectRef: "a" }),
  ).toEqual({ joined: true });
  expect(
    await t.mutation(api.mutations.join, { bucketRef: ref, subjectRef: "b" }),
  ).toEqual({ joined: true });
  const state = await t.query(api.queries.get, { bucketRef: ref });
  expect(state).toMatchObject({
    capacity: 2,
    memberCount: 2,
    status: "open",
  });
  const page = await t.query(api.queries.paginateMembers, {
    bucketRef: ref,
    // eslint-disable-next-line unicorn/no-null -- Convex serializes null; undefined is not a valid cursor/result.
    paginationOpts: { cursor: null, numItems: 1 },
  });
  expect(page.page).toHaveLength(1);
  expect(page.isDone).toBe(false);
  const members = await t.query(api.queries.listMembers, { bucketRef: ref });
  expect(members.map((m) => m.subjectRef).sort()).toEqual(["a", "b"]);
});

test("named open cannot collide", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "match-1" });
  await expect(
    t.mutation(api.mutations.open, { bucketRef: "match-1" }),
  ).rejects.toThrow();
});

test("full / already_member / missing join reasons", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m", capacity: 1 });
  expect(
    await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" }),
  ).toEqual({ joined: true });
  expect(
    await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" }),
  ).toEqual({ joined: false, reason: "already_member" });
  expect(
    await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "b" }),
  ).toEqual({ joined: false, reason: "full" });
  expect(
    await t.mutation(api.mutations.join, {
      bucketRef: "nope",
      subjectRef: "a",
    }),
  ).toEqual({ joined: false, reason: "missing" });
});

test("lock then close", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" });
  expect(await t.mutation(api.mutations.lock, { bucketRef: "m" })).toBe(true);
  expect(
    await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "b" }),
  ).toEqual({ joined: false, reason: "locked" });
  expect(
    await t.mutation(api.mutations.leave, {
      bucketRef: "m",
      subjectRef: "a",
    }),
  ).toBe(true);
  expect(await t.mutation(api.mutations.lock, { bucketRef: "m" })).toBe(false);
  expect(await t.mutation(api.mutations.close, { bucketRef: "m" })).toBe(true);
  expect(
    await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "c" }),
  ).toEqual({ joined: false, reason: "closed" });
  expect(
    await t.mutation(api.mutations.leave, {
      bucketRef: "m",
      subjectRef: "a",
    }),
  ).toBe(false);
  expect(await t.mutation(api.mutations.close, { bucketRef: "m" })).toBe(false);
});

test("close from open, leave missing, get missing", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  expect(await t.mutation(api.mutations.close, { bucketRef: "m" })).toBe(true);
  expect(
    await t.mutation(api.mutations.leave, {
      bucketRef: "missing",
      subjectRef: "a",
    }),
  ).toBe(false);
  expect(
    await t.mutation(api.mutations.leave, {
      bucketRef: "m",
      subjectRef: "ghost",
    }),
  ).toBe(false);
  expect(await t.query(api.queries.get, { bucketRef: "nope" })).toBeNull();
  expect(await t.mutation(api.mutations.lock, { bucketRef: "nope" })).toBe(
    false,
  );
  expect(await t.mutation(api.mutations.close, { bucketRef: "nope" })).toBe(
    false,
  );
});

test("eraseBucket batches members", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m", capacity: 4 });
  await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" });
  await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "b" });
  expect(
    await t.mutation(api.mutations.eraseBucket, { batch: 1, bucketRef: "m" }),
  ).toBe(1);
  expect(await t.mutation(api.mutations.eraseBucket, { bucketRef: "m" })).toBe(
    1,
  );
});

test("eraseBucket and eraseSubject", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" });
  expect(
    await t.mutation(api.mutations.eraseSubject, { subjectRef: "a" }),
  ).toBe(1);
  expect(await t.query(api.queries.listMembers, { bucketRef: "m" })).toEqual(
    [],
  );
  expect(await t.mutation(api.mutations.eraseBucket, { bucketRef: "m" })).toBe(
    0,
  );
  expect(await t.query(api.queries.get, { bucketRef: "m" })).toBeNull();
  expect(await t.mutation(api.mutations.eraseBucket, { bucketRef: "m" })).toBe(
    0,
  );
});

test("eraseSubject batches memberships", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m1" });
  await t.mutation(api.mutations.open, { bucketRef: "m2" });
  await t.mutation(api.mutations.join, { bucketRef: "m1", subjectRef: "a" });
  await t.mutation(api.mutations.join, { bucketRef: "m2", subjectRef: "a" });
  expect(
    await t.mutation(api.mutations.eraseSubject, {
      batch: 1,
      subjectRef: "a",
    }),
  ).toBe(1);
  expect(
    await t.mutation(api.mutations.eraseSubject, { subjectRef: "a" }),
  ).toBe(1);
});

test("leave unknown member on an open bucket", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  expect(
    await t.mutation(api.mutations.leave, {
      bucketRef: "m",
      subjectRef: "ghost",
    }),
  ).toBe(false);
});

test("eraseBucket deletes members", async () => {
  const t = setup();
  await t.mutation(api.mutations.open, { bucketRef: "m" });
  await t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "a" });
  expect(await t.mutation(api.mutations.eraseBucket, { bucketRef: "m" })).toBe(
    1,
  );
  expect(await t.query(api.queries.get, { bucketRef: "m" })).toBeNull();
});

test("rejects empty refs and bad capacity", async () => {
  const t = setup();
  await expect(
    t.mutation(api.mutations.open, { bucketRef: "", capacity: 1 }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.open, { capacity: 0 }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.join, { bucketRef: "", subjectRef: "a" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.join, { bucketRef: "m", subjectRef: "" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.leave, { bucketRef: "", subjectRef: "a" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.leave, { bucketRef: "m", subjectRef: "" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.lock, { bucketRef: "" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.close, { bucketRef: "" }),
  ).rejects.toThrow();
});

test("rejects invalid cleanup refs and bounds", async () => {
  const t = setup();
  await expect(
    t.mutation(api.mutations.eraseBucket, { bucketRef: "" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.eraseSubject, { subjectRef: "" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.eraseSubject, { batch: 0, subjectRef: "a" }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.eraseSubject, { batch: 1.5, subjectRef: "a" }),
  ).rejects.toThrow();
  await expect(
    t.query(api.queries.listMembers, { bucketRef: "m", limit: 0 }),
  ).rejects.toThrow();
  await expect(
    t.query(api.queries.listMembers, { bucketRef: "m", limit: 1.5 }),
  ).rejects.toThrow();
});

test("tenant scope is isolated", async () => {
  const t = setup();
  await t.mutation(api.mutations.openTenant, { bucketRef: "m" });
  expect(await t.query(api.queries.get, { bucketRef: "m" })).toBeNull();
});

test("erase and list limits", () => {
  expect(clampEraseBatch(10)).toBe(10);
  expect(clampEraseBatch(MAX_ERASE_BATCH + 1)).toBe(MAX_ERASE_BATCH);
  expect(() => clampEraseBatch(0)).toThrow();
  expect(clampListLimit(10)).toBe(10);
  expect(clampListLimit(MAX_LIST_LIMIT + 1)).toBe(MAX_LIST_LIMIT);
  expect(() => clampListLimit(0)).toThrow();
});
