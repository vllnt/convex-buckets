/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    mutations: {
      close: FunctionReference<
        "mutation",
        "internal",
        { bucketRef: string; scope: string },
        boolean,
        Name
      >;
      eraseBucket: FunctionReference<
        "mutation",
        "internal",
        { batch?: number; bucketRef: string; scope: string },
        number,
        Name
      >;
      eraseSubject: FunctionReference<
        "mutation",
        "internal",
        { batch?: number; scope: string; subjectRef: string },
        number,
        Name
      >;
      join: FunctionReference<
        "mutation",
        "internal",
        { bucketRef: string; scope: string; subjectRef: string },
        { joined: boolean; reason?: string },
        Name
      >;
      leave: FunctionReference<
        "mutation",
        "internal",
        { bucketRef: string; scope: string; subjectRef: string },
        boolean,
        Name
      >;
      lock: FunctionReference<
        "mutation",
        "internal",
        { bucketRef: string; scope: string },
        boolean,
        Name
      >;
      open: FunctionReference<
        "mutation",
        "internal",
        { bucketRef?: string; capacity?: number; scope: string },
        string,
        Name
      >;
    };
    queries: {
      get: FunctionReference<
        "query",
        "internal",
        { bucketRef: string; scope: string },
        null | {
          bucketRef: string;
          capacity?: number;
          closedAt?: number;
          lockedAt?: number;
          memberCount: number;
          openedAt: number;
          status: "open" | "locked" | "closed";
        },
        Name
      >;
      listMembers: FunctionReference<
        "query",
        "internal",
        { bucketRef: string; limit?: number; scope: string },
        Array<{ joinedAt: number; subjectRef: string }>,
        Name
      >;
      paginateMembers: FunctionReference<
        "query",
        "internal",
        {
          bucketRef: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scope: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{ joinedAt: number; subjectRef: string }>;
        },
        Name
      >;
    };
  };
