import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, MAX_REF_LENGTH } from "../shared";

import { query } from "./_generated/server";
import { bucketState, memberState } from "./validators";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

export const get = query({
  args: { bucketRef: v.string(), scope: v.string() },
  handler: async (ctx, arguments_) => {
    [arguments_.scope, arguments_.bucketRef].forEach((value) => {
      if (value.length === 0 || value.length > MAX_REF_LENGTH)
        fail("INVALID_REF", "refs must be 1..256 characters");
    });
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", arguments_.scope).eq("bucketRef", arguments_.bucketRef),
      )
      .unique();
    if (bucket === null) {
      // eslint-disable-next-line unicorn/no-null -- Convex serializes null; undefined is not a valid cursor/result.
      return null;
    }
    return {
      bucketRef: bucket.bucketRef,
      capacity: bucket.capacity,
      closedAt: bucket.closedAt,
      lockedAt: bucket.lockedAt,
      memberCount: bucket.memberCount,
      openedAt: bucket.openedAt,
      status: bucket.status,
    };
  },
  returns: v.union(v.null(), bucketState),
});

export const paginateMembers = query({
  args: {
    bucketRef: v.string(),
    paginationOpts: paginationOptsValidator,
    scope: v.string(),
  },
  handler: async (ctx, arguments_) => {
    [arguments_.scope, arguments_.bucketRef].forEach((value) => {
      if (value.length === 0 || value.length > MAX_REF_LENGTH)
        fail("INVALID_REF", "refs must be 1..256 characters");
    });
    const size = arguments_.paginationOpts.numItems;
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_LIST_LIMIT) {
      fail("INVALID_LIMIT", `numItems must be 1..${String(MAX_LIST_LIMIT)}`);
    }
    const result = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", arguments_.scope).eq("bucketRef", arguments_.bucketRef),
      )
      .paginate(arguments_.paginationOpts);
    return {
      continueCursor: result.continueCursor,
      isDone: result.isDone,
      page: result.page.map((member) => ({
        joinedAt: member.joinedAt,
        subjectRef: member.subjectRef,
      })),
    };
  },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    page: v.array(memberState),
  }),
});

/** Bounded preview; use paginateMembers to list every member. */
export const listMembers = query({
  args: {
    bucketRef: v.string(),
    limit: v.optional(v.number()),
    scope: v.string(),
  },
  handler: async (ctx, arguments_) => {
    [arguments_.scope, arguments_.bucketRef].forEach((value) => {
      if (value.length === 0 || value.length > MAX_REF_LENGTH)
        fail("INVALID_REF", "refs must be 1..256 characters");
    });
    const raw = arguments_.limit ?? DEFAULT_LIST_LIMIT;
    if (!Number.isSafeInteger(raw)) {
      fail("INVALID_LIMIT", "limit must be a positive integer");
    }
    if (raw < 1) {
      fail("INVALID_LIMIT", "limit must be a positive integer");
    }
    const limit = Math.min(raw, MAX_LIST_LIMIT);
    const members = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", arguments_.scope).eq("bucketRef", arguments_.bucketRef),
      )
      .take(limit);
    return members.map((member) => ({
      joinedAt: member.joinedAt,
      subjectRef: member.subjectRef,
    }));
  },
  returns: v.array(memberState),
});
