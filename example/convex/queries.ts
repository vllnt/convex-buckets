import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { Buckets } from "../../src/client";
import { bucketState, memberState } from "../../src/component/validators";

import { components } from "./_generated/api";
import { query } from "./_generated/server";

const buckets = new Buckets(components.buckets);

export const get = query({
  args: { bucketRef: v.string(), scope: v.optional(v.string()) },
  handler: (ctx, a) => buckets.get(ctx, a.bucketRef, a.scope),
  returns: v.union(v.null(), bucketState),
});

export const paginateMembers = query({
  args: {
    bucketRef: v.string(),
    paginationOpts: paginationOptsValidator,
    scope: v.optional(v.string()),
  },
  handler: (ctx, a) =>
    buckets.paginateMembers(ctx, a.bucketRef, a.paginationOpts, a.scope),
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    page: v.array(memberState),
  }),
});

export const listMembers = query({
  args: {
    bucketRef: v.string(),
    limit: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  handler: (ctx, a) => buckets.listMembers(ctx, a.bucketRef, a.scope, a.limit),
  returns: v.array(memberState),
});
