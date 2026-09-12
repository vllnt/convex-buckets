import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from "../shared";
import { bucketState, memberState } from "./validators";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

export const get = query({
  args: { bucketRef: v.string(), scope: v.string() },
  returns: v.union(v.null(), bucketState),
  handler: async (ctx, args) => {
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket === null) {
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
});

export const paginateMembers = query({
  args: {
    bucketRef: v.string(),
    scope: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(memberState),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const size = args.paginationOpts.numItems;
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_LIST_LIMIT) {
      fail("INVALID_LIMIT", `numItems must be 1..${MAX_LIST_LIMIT}`);
    }
    const result = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .paginate(args.paginationOpts);
    return {
      page: result.page.map((member) => ({
        joinedAt: member.joinedAt,
        subjectRef: member.subjectRef,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/** Bounded preview; use paginateMembers to enumerate a bucket. */
export const listMembers = query({
  args: {
    bucketRef: v.string(),
    limit: v.optional(v.number()),
    scope: v.string(),
  },
  returns: v.array(memberState),
  handler: async (ctx, args) => {
    const raw = args.limit ?? DEFAULT_LIST_LIMIT;
    if (!Number.isInteger(raw)) {
      fail("INVALID_LIMIT", "limit must be a positive integer");
    }
    if (raw < 1) {
      fail("INVALID_LIMIT", "limit must be a positive integer");
    }
    const limit = Math.min(raw, MAX_LIST_LIMIT);
    const members = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .take(limit);
    return members.map((member) => ({
      joinedAt: member.joinedAt,
      subjectRef: member.subjectRef,
    }));
  },
});
