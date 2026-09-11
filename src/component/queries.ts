import { v } from "convex/values";
import { query } from "./_generated/server";
import { bucketState, memberState } from "./validators";

export const get = query({
  args: { scope: v.string(), bucketRef: v.string() },
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
    const members = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .collect();
    return {
      bucketRef: bucket.bucketRef,
      status: bucket.status,
      capacity: bucket.capacity,
      memberCount: members.length,
      openedAt: bucket.openedAt,
      lockedAt: bucket.lockedAt,
      closedAt: bucket.closedAt,
    };
  },
});

export const listMembers = query({
  args: { scope: v.string(), bucketRef: v.string() },
  returns: v.array(memberState),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .collect();
    return members.map((member) => ({
      subjectRef: member.subjectRef,
      joinedAt: member.joinedAt,
    }));
  },
});
