import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Sandboxed tables — ephemeral groups of opaque `subjectRef`s. Distinct from
 * `convex-memberships` (standing org/roles) and `@convex-dev/presence` (liveness).
 */
export default defineSchema({
  buckets: defineTable({
    bucketRef: v.string(),
    scope: v.string(),
    status: v.union(v.literal("open"), v.literal("locked"), v.literal("closed")),
    capacity: v.optional(v.number()),
    openedAt: v.number(),
    lockedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  }).index("by_scope_ref", ["scope", "bucketRef"]),
  members: defineTable({
    bucketRef: v.string(),
    scope: v.string(),
    subjectRef: v.string(),
    joinedAt: v.number(),
  })
    .index("by_bucket", ["scope", "bucketRef"])
    .index("by_bucket_subject", ["scope", "bucketRef", "subjectRef"])
    .index("by_subject", ["scope", "subjectRef"]),
});
