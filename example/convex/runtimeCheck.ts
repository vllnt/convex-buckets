import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/** Local-only verification entrypoint. Do not expose the unauthenticated example in production. */
export const verify = action({
  args: {},
  returns: v.object({ admitted: v.number(), schedulerDrained: v.boolean() }),
  handler: async (ctx) => {
    const bucketRef = `runtime-${crypto.randomUUID()}`;
    await ctx.runMutation(api.example.open, { bucketRef, capacity: 3 });
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        ctx.runMutation(api.example.join, { bucketRef, subjectRef: `s${i}` }),
      ),
    );
    const admitted = results.filter((r) => r.joined).length;
    const state = await ctx.runQuery(api.example.get, { bucketRef });
    if (admitted !== 3 || state?.memberCount !== 3)
      throw new Error("capacity/OCC mismatch");
    await ctx.runMutation(api.example.eraseBucket, { bucketRef, batch: 1 });
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await ctx.runQuery(api.example.get, { bucketRef })) === null) {
        await ctx.runMutation(api.example.open, { bucketRef });
        await ctx.runMutation(api.example.join, {
          bucketRef,
          subjectRef: "replacement",
        });
        const replacement = await ctx.runQuery(api.example.get, { bucketRef });
        if (replacement?.memberCount !== 1)
          throw new Error("replacement generation damaged");
        await ctx.runMutation(api.example.eraseBucket, { bucketRef });
        return { admitted, schedulerDrained: true };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("scheduler did not drain within 5 seconds");
  },
});
