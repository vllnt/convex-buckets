import { v } from "convex/values";

import { api, components } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";

async function verifyCapacity(
  ctx: ActionCtx,
  bucketRef: string,
): Promise<number> {
  await ctx.runMutation(api.mutations.open, { bucketRef, capacity: 3 });
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      ctx.runMutation(api.mutations.join, {
        bucketRef,
        subjectRef: `s${String(index)}`,
      }),
    ),
  );
  const admitted = results.filter((result) => result.joined).length;
  const state = await ctx.runQuery(api.queries.get, { bucketRef });
  if (admitted !== 3 || state?.memberCount !== 3)
    throw new Error("capacity/OCC mismatch");
  return admitted;
}

async function awaitDeletion(
  ctx: ActionCtx,
  bucketRef: string,
  remaining = 100,
): Promise<void> {
  if ((await ctx.runQuery(api.queries.get, { bucketRef })) === null) return;
  if (remaining === 0)
    throw new Error("scheduler did not drain within 5 seconds");
  await new Promise((resolve) => setTimeout(resolve, 50));
  await awaitDeletion(ctx, bucketRef, remaining - 1);
}

async function verifyReplacement(
  ctx: ActionCtx,
  bucketRef: string,
): Promise<void> {
  await ctx.runMutation(api.mutations.open, { bucketRef });
  await ctx.runMutation(api.mutations.join, {
    bucketRef,
    subjectRef: "replacement",
  });
  const replacement = await ctx.runQuery(api.queries.get, { bucketRef });
  if (replacement?.memberCount !== 1)
    throw new Error("replacement generation damaged");
  await ctx.runMutation(api.mutations.eraseBucket, { bucketRef });
}

/** Local verification entrypoint. Do not expose the unauthenticated example in production. */
export const verify = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ admitted: number; schedulerDrained: boolean }> => {
    const bucketRef = `runtime-${crypto.randomUUID()}`;
    const ref = { bucketRef, scope: "global" };
    await ctx.runMutation(components.isolated.mutations.open, ref);
    await ctx.runMutation(components.isolated.mutations.join, {
      ...ref,
      subjectRef: "isolated",
    });
    const admitted = await verifyCapacity(ctx, bucketRef);
    await ctx.runMutation(api.mutations.eraseBucket, { batch: 1, bucketRef });
    await awaitDeletion(ctx, bucketRef);
    await verifyReplacement(ctx, bucketRef);
    await ctx.runMutation(api.mutations.snapshotFixture, { bucketRef });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const snapshot = await ctx.runQuery(api.queries.get, { bucketRef });
    if (snapshot?.memberCount !== 1)
      throw new Error("snapshot erased recreation");
    await ctx.runMutation(api.mutations.eraseBucket, { bucketRef });
    const isolated = await ctx.runQuery(components.isolated.queries.get, ref);
    if (isolated?.memberCount !== 1) throw new Error("mount isolation failed");
    await ctx.runMutation(components.isolated.mutations.eraseBucket, ref);
    return { admitted, schedulerDrained: true };
  },
  returns: v.object({ admitted: v.number(), schedulerDrained: v.boolean() }),
});
