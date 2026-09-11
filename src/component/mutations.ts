import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function requireRef(value: string, name: string): void {
  if (value.length === 0) {
    fail("INVALID_REF", `${name} must be a non-empty string`);
  }
}

export const open = mutation({
  args: {
    scope: v.string(),
    bucketRef: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.capacity !== undefined) {
      if (!Number.isInteger(args.capacity) || args.capacity < 1) {
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
      fail("BUCKET_EXISTS", "a bucket with this ref already exists in the scope");
    }
    await ctx.db.insert("buckets", {
      bucketRef,
      scope: args.scope,
      status: "open",
      capacity: args.capacity,
      openedAt: Date.now(),
    });
    return bucketRef;
  },
});

export const join = mutation({
  args: {
    scope: v.string(),
    bucketRef: v.string(),
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
    if (bucket.capacity !== undefined) {
      const members = await ctx.db
        .query("members")
        .withIndex("by_bucket", (q) =>
          q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
        )
        .take(bucket.capacity);
      if (members.length >= bucket.capacity) {
        return { joined: false, reason: "full" };
      }
    }
    await ctx.db.insert("members", {
      bucketRef: args.bucketRef,
      scope: args.scope,
      subjectRef: args.subjectRef,
      joinedAt: Date.now(),
    });
    return { joined: true };
  },
});

export const leave = mutation({
  args: {
    scope: v.string(),
    bucketRef: v.string(),
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
    return true;
  },
});

export const lock = mutation({
  args: { scope: v.string(), bucketRef: v.string() },
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
      status: "locked",
      lockedAt: Date.now(),
    });
    return true;
  },
});

export const close = mutation({
  args: { scope: v.string(), bucketRef: v.string() },
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
      status: "closed",
      closedAt: Date.now(),
    });
    return true;
  },
});

export const eraseBucket = mutation({
  args: { scope: v.string(), bucketRef: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    requireRef(args.bucketRef, "bucketRef");
    const members = await ctx.db
      .query("members")
      .withIndex("by_bucket", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .collect();
    for (const member of members) {
      await ctx.db.delete("members", member._id);
    }
    const bucket = await ctx.db
      .query("buckets")
      .withIndex("by_scope_ref", (q) =>
        q.eq("scope", args.scope).eq("bucketRef", args.bucketRef),
      )
      .unique();
    if (bucket !== null) {
      await ctx.db.delete("buckets", bucket._id);
    }
    return members.length;
  },
});

export const eraseSubject = mutation({
  args: { scope: v.string(), subjectRef: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    requireRef(args.subjectRef, "subjectRef");
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_subject", (q) =>
        q.eq("scope", args.scope).eq("subjectRef", args.subjectRef),
      )
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete("members", membership._id);
    }
    return memberships.length;
  },
});
