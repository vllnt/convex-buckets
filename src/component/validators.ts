import { v } from "convex/values";

export const bucketStatus = v.union(
  v.literal("open"),
  v.literal("locked"),
  v.literal("closed"),
);

export const bucketState = v.object({
  bucketRef: v.string(),
  capacity: v.optional(v.number()),
  closedAt: v.optional(v.number()),
  lockedAt: v.optional(v.number()),
  memberCount: v.number(),
  openedAt: v.number(),
  status: bucketStatus,
});

export const memberState = v.object({
  joinedAt: v.number(),
  subjectRef: v.string(),
});
