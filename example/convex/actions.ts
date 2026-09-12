import { v } from "convex/values";

import { api, components } from "./_generated/api";
import { action } from "./_generated/server";

/** Local-only verification entrypoint. Do not expose the unauthenticated example in production. */
export const verify = action({
  args: {},
  handler: async (ctx) => {
    const bucketRef = `runtime-${crypto.randomUUID()}`;
    await ctx.runMutation(components.isolated.mutations.open, {
      bucketRef,
      scope: "global",
    });
    await ctx.runMutation(components.isolated.mutations.join, {
      bucketRef,
      scope: "global",
      subjectRef: "isolated",
    });
    await ctx.runMutation(api.mutations.open, { bucketRef, capacity: 3 });
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        ctx.runMutation(api.mutations.join, {
          bucketRef,
          subjectRef: `s${index}`,
        }),
      ),
    );
    const admitted = results.filter((r) => r.joined).length;
    const state = await ctx.runQuery(api.queries.get, { bucketRef });
    if (admitted !== 3 || state?.memberCount !== 3)
      throw new Error("capacity/OCC mismatch");
    await ctx.runMutation(api.mutations.eraseBucket, { batch: 1, bucketRef });
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await ctx.runQuery(api.queries.get, { bucketRef })) === null) {
        await ctx.runMutation(api.mutations.open, { bucketRef });
        await ctx.runMutation(api.mutations.join, {
          bucketRef,
          subjectRef: "replacement",
        });
        const replacement = await ctx.runQuery(api.queries.get, { bucketRef });
        if (replacement?.memberCount !== 1)
          throw new Error("replacement generation damaged");
        await ctx.runMutation(api.mutations.eraseBucket, { bucketRef });
        const isolated = await ctx.runQuery(components.isolated.queries.get, {
          bucketRef,
          scope: "global",
        });
        if (isolated?.memberCount !== 1)
          throw new Error("mount isolation failed");
        await ctx.runMutation(components.isolated.mutations.eraseBucket, {
          bucketRef,
          scope: "global",
        });
        return { admitted, schedulerDrained: true };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("scheduler did not drain within 5 seconds");
  },
  returns: v.object({ admitted: v.number(), schedulerDrained: v.boolean() }),
});
