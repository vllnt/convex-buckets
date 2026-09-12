import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Sandboxed tables — ephemeral groups of opaque `subjectRef`s. Distinct from
 * `convex-memberships` (standing org/roles) and `@convex-dev/presence` (liveness).
 *
 * `memberCount` lives on the bucket row so join capacity is OCC-safe: concurrent
 * joins patch the same document and Convex retries the loser.
 */
export default defineSchema({
  buckets: defineTable({
    bucketRef: v.string(),
    capacity: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
    memberCount: v.number(),
    openedAt: v.number(),
    scope: v.string(),
    status: v.union(
      v.literal("closed"),
      v.literal("locked"),
      v.literal("open"),
    ),
  }).index("by_scope_ref", ["scope", "bucketRef"]),
  members: defineTable({
    bucketRef: v.string(),
    joinedAt: v.number(),
    scope: v.string(),
    subjectRef: v.string(),
  })
    .index("by_bucket", ["scope", "bucketRef"])
    .index("by_bucket_subject", ["scope", "bucketRef", "subjectRef"])
    .index("by_subject", ["scope", "subjectRef"]),
});
