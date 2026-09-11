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

type BucketState = {
  bucketRef: string;
  capacity?: number;
  closedAt?: number;
  lockedAt?: number;
  memberCount: number;
  openedAt: number;
  status: "open" | "locked" | "closed";
};

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
        { bucketRef: string; scope: string },
        number,
        Name
      >;
      eraseSubject: FunctionReference<
        "mutation",
        "internal",
        { scope: string; subjectRef: string },
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
        BucketState | null,
        Name
      >;
      listMembers: FunctionReference<
        "query",
        "internal",
        { bucketRef: string; scope: string },
        { joinedAt: number; subjectRef: string }[],
        Name
      >;
    };
  };
