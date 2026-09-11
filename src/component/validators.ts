import { v } from "convex/values";

export const bucketStatus = v.union(
  v.literal("open"),
  v.literal("locked"),
  v.literal("closed"),
);

export const bucketState = v.object({
  bucketRef: v.string(),
  status: bucketStatus,
  capacity: v.optional(v.number()),
  memberCount: v.number(),
  openedAt: v.number(),
  lockedAt: v.optional(v.number()),
  closedAt: v.optional(v.number()),
});

export const memberState = v.object({
  subjectRef: v.string(),
  joinedAt: v.number(),
});
