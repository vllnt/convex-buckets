import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  DEFAULT_ERASE_BATCH,
  MAX_ERASE_BATCH,
  MAX_REF_LENGTH,
} from "../shared";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function requireRef(value: string, name: string): void {
  if (value.length === 0 || value.length > MAX_REF_LENGTH) {
    fail("INVALID_REF", `${name} must be 1..${MAX_REF_LENGTH} characters`);
  }
}

function parseBatch(batch: number | undefined): number {
  const raw = batch ?? DEFAULT_ERASE_BATCH;
  if (!Number.isInteger(raw)) {
    fail("INVALID_BATCH", "batch must be a positive integer");
  }
  if (raw < 1) {
    fail("INVALID_BATCH", "batch must be a positive integer");
  }
  return Math.min(raw, MAX_ERASE_BATCH);
}

export const open = mutation({
  args: {
    bucketRef: v.optional(v.string()),
    capacity: v.optional(v.number()),
    scope: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.capacity !== undefined) {
      if (!Number.isSafeInteger(args.capacity) || args.capacity < 1) {
        fail("INVALID_CAPACITY", "capacity must be a positive integer");
      }
    }
    const bucketRef = args.bucketRef ?? crypto.randomUUID();
    requireRef(bucketRef, "bucketRef");
    const existing = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", bucketRef),
      )
      .unique();
    if (existing !== null) {
      fail(
        "BUCKET_EXISTS",
        "a bucket with this ref already exists in the scope",
      );
    }
    await ctx.db.insert("buckets", {
      bucketRef,
      capacity: args.capacity,
      memberCount: 0,
      openedAt: Date.now(),
      scope: args.scope,
      status: "open",
    });
    return bucketRef;
  },
});

export const join = mutation({
  args: {
    bucketRef: v.string(),
    scope: v.string(),
    subjectRef: v.string(),
  },
  returns: v.object({ joined: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    requireRef(args.bucketRef, "bucketRef");
    requireRef(args.subjectRef, "subjectRef");
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket === null) {
      return { joined: false, reason: "missing" };
    }
    if (bucket.status !== "open") {
      return { joined: false, reason: bucket.status };
    }
    const existing = await ctx.db
      .query("members")
      .withIndex("by_bucket_subject", (q) =>
        q
          .eq("scope", args.scope)
          .eq("bucketRef", args.bucketRef)
          .eq("subjectRef", args.subjectRef),
      )
      .unique();
    if (existing !== null) {
      return { joined: false, reason: "already_member" };
    }
    if (
      bucket.capacity !== undefined &&
      bucket.memberCount >= bucket.capacity
    ) {
      return { joined: false, reason: "full" };
    }
    await ctx.db.insert("members", {
      bucketRef: args.bucketRef,
      joinedAt: Date.now(),
      scope: args.scope,
      subjectRef: args.subjectRef,
    });
    await ctx.db.patch("buckets", bucket._id, {
      memberCount: bucket.memberCount + 1,
    });
    return { joined: true };
  },
});

export const leave = mutation({
  args: {
    bucketRef: v.string(),
    scope: v.string(),
    subjectRef: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireRef(args.bucketRef, "bucketRef");
    requireRef(args.subjectRef, "subjectRef");
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket === null || bucket.status === "closed") {
      return false;
    }
    const existing = await ctx.db
      .query("members")
      .withIndex("by_bucket_subject", (q) =>
        q
          .eq("scope", args.scope)
          .eq("bucketRef", args.bucketRef)
          .eq("subjectRef", args.subjectRef),
      )
      .unique();
    if (existing === null) {
      return false;
    }
    await ctx.db.delete("members", existing._id);
    await ctx.db.patch("buckets", bucket._id, {
      memberCount: Math.max(bucket.memberCount - 1, 0),
    });
    return true;
  },
});

export const lock = mutation({
  args: { bucketRef: v.string(), scope: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireRef(args.bucketRef, "bucketRef");
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket === null || bucket.status !== "open") {
      return false;
    }
    await ctx.db.patch("buckets", bucket._id, {
      lockedAt: Date.now(),
      status: "locked",
    });
    return true;
  },
});

export const close = mutation({
  args: { bucketRef: v.string(), scope: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireRef(args.bucketRef, "bucketRef");
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket === null || bucket.status === "closed") {
      return false;
    }
    await ctx.db.patch("buckets", bucket._id, {
      closedAt: Date.now(),
      status: "closed",
    });
    return true;
  },
});

export const eraseBucket = mutation({
  args: {
    batch: v.optional(v.number()),
    bucketRef: v.string(),
    scope: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    requireRef(args.bucketRef, "bucketRef");
    const batch = parseBatch(args.batch);
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket === null) return 0;
    return eraseBucketBatch(ctx, bucket._id, batch);
  },
});

async function eraseBucketBatch(
  ctx: MutationCtx,
  bucketId: Id<"buckets">,
  batch: number,
): Promise<number> {
  const bucket = await ctx.db.get("buckets", bucketId);
  if (bucket === null) return 0;
  const members = await ctx.db
    .query("members")
    .withIndex("by_bucket", (q) =>
      q.eq("scope", bucket.scope).eq("bucketRef", bucket.bucketRef),
    )
    .take(batch);
  await Promise.all(
    members.map((member) => ctx.db.delete("members", member._id)),
  );
  if (members.length < batch) {
    await ctx.db.delete("buckets", bucketId);
  } else {
    await ctx.db.patch("buckets", bucketId, {
      status: "closed",
      closedAt: bucket.closedAt ?? Date.now(),
      memberCount: Math.max(0, bucket.memberCount - members.length),
    });
    await ctx.scheduler.runAfter(0, internal.mutations.continueEraseBucket, {
      bucketId,
      batch,
    });
  }
  return members.length;
}

export const continueEraseBucket = internalMutation({
  args: { bucketId: v.id("buckets"), batch: v.number() },
  returns: v.number(),
  handler: async (ctx, args) =>
    eraseBucketBatch(ctx, args.bucketId, parseBatch(args.batch)),
});

export const eraseSubject = mutation({
  args: {
    batch: v.optional(v.number()),
    scope: v.string(),
    subjectRef: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    requireRef(args.subjectRef, "subjectRef");
    const batch = parseBatch(args.batch);
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_subject", (q) =>
        q.eq("scope", args.scope).eq("subjectRef", args.subjectRef),
      )
      .take(batch);
    await Promise.all(
      memberships.map(async (membership) => {
        await ctx.db.delete("members", membership._id);
        const bucket = await ctx.db
          .query("buckets")
          .withIndex("by_scope_ref", (q) =>
            q
              .eq("scope", membership.scope)
              .eq("bucketRef", membership.bucketRef),
          )
          .unique();
        if (bucket !== null) {
          await ctx.db.patch("buckets", bucket._id, {
            memberCount: Math.max(0, bucket.memberCount - 1),
          });
        }
      }),
    );
    if (memberships.length === batch) {
      await ctx.scheduler.runAfter(0, api.mutations.eraseSubject, {
        batch,
        scope: args.scope,
        subjectRef: args.subjectRef,
      });
    }
    return memberships.length;
  },
});
