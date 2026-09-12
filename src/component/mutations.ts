import { ConvexError, v } from "convex/values";

import {
  DEFAULT_ERASE_BATCH,
  MAX_ERASE_BATCH,
  MAX_REF_LENGTH,
} from "../shared";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";

function findBucket(
  ctx: MutationCtx,
  ref: { bucketRef: string; scope: string },
) {
  return ctx.db
    .query("buckets")
    .withIndex("by_scope_ref", (q) =>
      q.eq("scope", ref.scope).eq("bucketRef", ref.bucketRef),
    )
    .unique();
}

function findMember(
  ctx: MutationCtx,
  ref: { bucketRef: string; scope: string; subjectRef: string },
) {
  return ctx.db
    .query("members")
    .withIndex("by_bucket_subject", (q) =>
      q
        .eq("scope", ref.scope)
        .eq("bucketRef", ref.bucketRef)
        .eq("subjectRef", ref.subjectRef),
    )
    .unique();
}

function membersInBucket(
  ctx: MutationCtx,
  ref: { bucketRef: string; scope: string },
) {
  return ctx.db
    .query("members")
    .withIndex("by_bucket", (q) =>
      q.eq("scope", ref.scope).eq("bucketRef", ref.bucketRef),
    );
}

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function requireRef(value: string, name: string): void {
  if (value.length === 0 || value.length > MAX_REF_LENGTH) {
    fail(
      "INVALID_REF",
      `${name} must be 1..${String(MAX_REF_LENGTH)} characters`,
    );
  }
}

function parseBatch(batch: number | undefined): number {
  const raw = batch ?? DEFAULT_ERASE_BATCH;
  if (!Number.isSafeInteger(raw)) {
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
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    if (
      arguments_.capacity !== undefined &&
      (!Number.isSafeInteger(arguments_.capacity) || arguments_.capacity < 1)
    ) {
      fail("INVALID_CAPACITY", "capacity must be a positive integer");
    }
    const bucketRef = arguments_.bucketRef ?? crypto.randomUUID();
    requireRef(bucketRef, "bucketRef");
    const existing = await findBucket(ctx, {
      bucketRef,
      scope: arguments_.scope,
    });
    if (existing !== null) {
      fail(
        "BUCKET_EXISTS",
        "a bucket with this ref already exists in the scope",
      );
    }
    await ctx.db.insert("buckets", {
      bucketRef,
      capacity: arguments_.capacity,
      memberCount: 0,
      openedAt: Date.now(),
      scope: arguments_.scope,
      status: "open",
    });
    return bucketRef;
  },
  returns: v.string(),
});

export const join = mutation({
  args: {
    bucketRef: v.string(),
    scope: v.string(),
    subjectRef: v.string(),
  },
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    requireRef(arguments_.bucketRef, "bucketRef");
    requireRef(arguments_.subjectRef, "subjectRef");
    const bucket = await findBucket(ctx, arguments_);
    if (bucket === null) {
      return { joined: false, reason: "missing" };
    }
    if (bucket.status !== "open") {
      return { joined: false, reason: bucket.status };
    }
    const existing = await findMember(ctx, arguments_);
    if (existing !== null) {
      return { joined: false, reason: "already_member" };
    }
    if (
      bucket.capacity !== undefined &&
      bucket.memberCount >= bucket.capacity
    ) {
      return { joined: false, reason: "full" };
    }
    await ctx.db.insert("members", { ...arguments_, joinedAt: Date.now() });
    await ctx.db.patch("buckets", bucket._id, {
      memberCount: bucket.memberCount + 1,
    });
    return { joined: true };
  },
  returns: v.object({ joined: v.boolean(), reason: v.optional(v.string()) }),
});

export const leave = mutation({
  args: {
    bucketRef: v.string(),
    scope: v.string(),
    subjectRef: v.string(),
  },
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    requireRef(arguments_.bucketRef, "bucketRef");
    requireRef(arguments_.subjectRef, "subjectRef");
    const bucket = await findBucket(ctx, arguments_);
    if (bucket === null || bucket.status === "closed") {
      return false;
    }
    const existing = await findMember(ctx, arguments_);
    if (existing === null) {
      return false;
    }
    await ctx.db.delete("members", existing._id);
    await ctx.db.patch("buckets", bucket._id, {
      memberCount: Math.max(bucket.memberCount - 1, 0),
    });
    return true;
  },
  returns: v.boolean(),
});

export const lock = mutation({
  args: { bucketRef: v.string(), scope: v.string() },
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    requireRef(arguments_.bucketRef, "bucketRef");
    const bucket = await findBucket(ctx, arguments_);
    if (bucket?.status !== "open") {
      return false;
    }
    await ctx.db.patch("buckets", bucket._id, {
      lockedAt: Date.now(),
      status: "locked",
    });
    return true;
  },
  returns: v.boolean(),
});

export const close = mutation({
  args: { bucketRef: v.string(), scope: v.string() },
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    requireRef(arguments_.bucketRef, "bucketRef");
    const bucket = await findBucket(ctx, arguments_);
    if (bucket === null || bucket.status === "closed") {
      return false;
    }
    await ctx.db.patch("buckets", bucket._id, {
      closedAt: Date.now(),
      status: "closed",
    });
    return true;
  },
  returns: v.boolean(),
});

export const eraseBucket = mutation({
  args: {
    batch: v.optional(v.number()),
    bucketRef: v.string(),
    scope: v.string(),
  },
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    requireRef(arguments_.bucketRef, "bucketRef");
    const batch = parseBatch(arguments_.batch);
    const bucket = await findBucket(ctx, arguments_);
    if (bucket === null) return 0;
    return eraseBucketBatch(ctx, bucket._id, batch);
  },
  returns: v.number(),
});

async function eraseBucketBatch(
  ctx: MutationCtx,
  bucketId: Id<"buckets">,
  batch: number,
): Promise<number> {
  const bucket = await ctx.db.get("buckets", bucketId);
  if (bucket === null) return 0;
  const members = await membersInBucket(ctx, bucket).take(batch);
  await Promise.all(
    members.map((member) => ctx.db.delete("members", member._id)),
  );
  if (members.length < batch) {
    await ctx.db.delete("buckets", bucketId);
  } else {
    await ctx.db.patch("buckets", bucketId, {
      closedAt: bucket.closedAt ?? Date.now(),
      memberCount: Math.max(0, bucket.memberCount - members.length),
      status: "closed",
    });
    await ctx.scheduler.runAfter(0, internal.mutations.continueEraseBucket, {
      batch,
      bucketId,
    });
  }
  return members.length;
}

export const continueEraseBucket = internalMutation({
  args: { batch: v.number(), bucketId: v.id("buckets") },
  handler: async (ctx, arguments_) =>
    eraseBucketBatch(ctx, arguments_.bucketId, parseBatch(arguments_.batch)),
  returns: v.number(),
});

export const eraseSubject = mutation({
  args: {
    batch: v.optional(v.number()),
    scope: v.string(),
    subjectRef: v.string(),
  },
  handler: async (ctx, arguments_) => {
    requireRef(arguments_.scope, "scope");
    requireRef(arguments_.subjectRef, "subjectRef");
    const batch = parseBatch(arguments_.batch);
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_subject", (q) =>
        q.eq("scope", arguments_.scope).eq("subjectRef", arguments_.subjectRef),
      )
      .take(batch);
    await Promise.all(
      memberships.map(async (membership) => {
        await ctx.db.delete("members", membership._id);
        const bucket = await findBucket(ctx, membership);
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
        scope: arguments_.scope,
        subjectRef: arguments_.subjectRef,
      });
    }
    return memberships.length;
  },
  returns: v.number(),
});
