import { v } from "convex/values";

import { Buckets } from "../../src/client";

import { components } from "./_generated/api";
import { mutation } from "./_generated/server";

const buckets = new Buckets(components.buckets);
const tenant = new Buckets(components.buckets, { defaultScope: "tenant" });

const joinResult = v.object({
  joined: v.boolean(),
  reason: v.optional(v.string()),
});

export const open = mutation({
  args: {
    bucketRef: v.optional(v.string()),
    capacity: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  handler: (ctx, a) =>
    buckets.open(ctx, {
      bucketRef: a.bucketRef,
      capacity: a.capacity,
      scope: a.scope,
    }),
  returns: v.string(),
});

export const join = mutation({
  args: {
    bucketRef: v.string(),
    scope: v.optional(v.string()),
    subjectRef: v.string(),
  },
  handler: (ctx, a) => buckets.join(ctx, a.bucketRef, a.subjectRef, a.scope),
  returns: joinResult,
});

export const leave = mutation({
  args: {
    bucketRef: v.string(),
    scope: v.optional(v.string()),
    subjectRef: v.string(),
  },
  handler: (ctx, a) => buckets.leave(ctx, a.bucketRef, a.subjectRef, a.scope),
  returns: v.boolean(),
});

export const lock = mutation({
  args: { bucketRef: v.string(), scope: v.optional(v.string()) },
  handler: (ctx, a) => buckets.lock(ctx, a.bucketRef, a.scope),
  returns: v.boolean(),
});

export const close = mutation({
  args: { bucketRef: v.string(), scope: v.optional(v.string()) },
  handler: (ctx, a) => buckets.close(ctx, a.bucketRef, a.scope),
  returns: v.boolean(),
});

export const eraseBucket = mutation({
  args: {
    batch: v.optional(v.number()),
    bucketRef: v.string(),
    scope: v.optional(v.string()),
  },
  handler: (ctx, a) => buckets.eraseBucket(ctx, a.bucketRef, a.scope, a.batch),
  returns: v.number(),
});

export const eraseSubject = mutation({
  args: {
    batch: v.optional(v.number()),
    scope: v.optional(v.string()),
    subjectRef: v.string(),
  },
  handler: (ctx, a) =>
    buckets.eraseSubject(ctx, a.subjectRef, a.scope, a.batch),
  returns: v.number(),
});

export const openTenant = mutation({
  args: { bucketRef: v.string() },
  handler: (ctx, a) => tenant.open(ctx, { bucketRef: a.bucketRef }),
  returns: v.string(),
});

/** Caller-driven erasure completes without scheduling later subject sweeps. */
export const subjectEraseFixture = mutation({
  args: { bucketRef: v.string() },
  handler: async (ctx, { bucketRef }) => {
    await buckets.open(ctx, { bucketRef });
    await buckets.join(ctx, bucketRef, "subject");
    const removed = await buckets.eraseSubject(ctx, "subject", undefined, 1);
    const empty = await buckets.eraseSubject(ctx, "subject");
    if (removed !== 1 || empty !== 0)
      throw new Error("subject batch did not drain");
    await buckets.join(ctx, bucketRef, "subject");
    // eslint-disable-next-line unicorn/no-null -- Convex mutation return validator requires null.
    return null;
  },
  returns: v.null(),
});
