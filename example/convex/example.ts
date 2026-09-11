import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { Buckets } from "../../src/client";
import { bucketState, memberState } from "../../src/component/validators";

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
  returns: v.string(),
  handler: (ctx, a) =>
    buckets.open(ctx, { bucketRef: a.bucketRef, capacity: a.capacity, scope: a.scope }),
});

export const join = mutation({
  args: {
    bucketRef: v.string(),
    subjectRef: v.string(),
    scope: v.optional(v.string()),
  },
  returns: joinResult,
  handler: (ctx, a) => buckets.join(ctx, a.bucketRef, a.subjectRef, a.scope),
});

export const leave = mutation({
  args: {
    bucketRef: v.string(),
    subjectRef: v.string(),
    scope: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: (ctx, a) => buckets.leave(ctx, a.bucketRef, a.subjectRef, a.scope),
});

export const lock = mutation({
  args: { bucketRef: v.string(), scope: v.optional(v.string()) },
  returns: v.boolean(),
  handler: (ctx, a) => buckets.lock(ctx, a.bucketRef, a.scope),
});

export const close = mutation({
  args: { bucketRef: v.string(), scope: v.optional(v.string()) },
  returns: v.boolean(),
  handler: (ctx, a) => buckets.close(ctx, a.bucketRef, a.scope),
});

export const get = query({
  args: { bucketRef: v.string(), scope: v.optional(v.string()) },
  returns: v.union(v.null(), bucketState),
  handler: (ctx, a) => buckets.get(ctx, a.bucketRef, a.scope),
});

export const listMembers = query({
  args: {
    bucketRef: v.string(),
    limit: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  returns: v.array(memberState),
  handler: (ctx, a) =>
    buckets.listMembers(ctx, a.bucketRef, a.scope, a.limit),
});

export const eraseBucket = mutation({
  args: {
    batch: v.optional(v.number()),
    bucketRef: v.string(),
    scope: v.optional(v.string()),
  },
  returns: v.number(),
  handler: (ctx, a) => buckets.eraseBucket(ctx, a.bucketRef, a.scope, a.batch),
});

export const eraseSubject = mutation({
  args: {
    batch: v.optional(v.number()),
    scope: v.optional(v.string()),
    subjectRef: v.string(),
  },
  returns: v.number(),
  handler: (ctx, a) =>
    buckets.eraseSubject(ctx, a.subjectRef, a.scope, a.batch),
});

export const openTenant = mutation({
  args: { bucketRef: v.string() },
  returns: v.string(),
  handler: (ctx, a) => tenant.open(ctx, { bucketRef: a.bucketRef }),
});
