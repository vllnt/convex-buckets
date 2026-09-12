import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type {
  BucketState,
  BucketStatus,
  BucketsOptions,
  JoinResult,
  MemberState,
  OpenOptions,
} from "./types.js";
import {
  DEFAULT_ERASE_BATCH,
  DEFAULT_LIST_LIMIT,
  DEFAULT_SCOPE,
} from "../shared.js";

export interface BucketsComponent {
  mutations: {
    open: FunctionReference<
      "mutation",
      "internal",
      { scope: string; bucketRef?: string; capacity?: number },
      string
    >;
    join: FunctionReference<
      "mutation",
      "internal",
      { scope: string; bucketRef: string; subjectRef: string },
      JoinResult
    >;
    leave: FunctionReference<
      "mutation",
      "internal",
      { scope: string; bucketRef: string; subjectRef: string },
      boolean
    >;
    lock: FunctionReference<
      "mutation",
      "internal",
      { scope: string; bucketRef: string },
      boolean
    >;
    close: FunctionReference<
      "mutation",
      "internal",
      { scope: string; bucketRef: string },
      boolean
    >;
    eraseBucket: FunctionReference<
      "mutation",
      "internal",
      { batch?: number; bucketRef: string; scope: string },
      number
    >;
    eraseSubject: FunctionReference<
      "mutation",
      "internal",
      { batch?: number; scope: string; subjectRef: string },
      number
    >;
  };
  queries: {
    paginateMembers: FunctionReference<
      "query",
      "internal",
      { bucketRef: string; scope: string; paginationOpts: PaginationOptions },
      PaginationResult<MemberState>
    >;
    get: FunctionReference<
      "query",
      "internal",
      { scope: string; bucketRef: string },
      BucketState | null
    >;
    listMembers: FunctionReference<
      "query",
      "internal",
      { bucketRef: string; limit?: number; scope: string },
      MemberState[]
    >;
  };
}

interface RunQueryCtx {
  runQuery<Q extends FunctionReference<"query", "internal">>(
    reference: Q,
    args: FunctionArgs<Q>,
  ): Promise<FunctionReturnType<Q>>;
}

interface RunMutationCtx {
  runMutation<M extends FunctionReference<"mutation", "internal">>(
    reference: M,
    args: FunctionArgs<M>,
  ): Promise<FunctionReturnType<M>>;
}

export class Buckets {
  private readonly defaultScope: string;

  constructor(
    private readonly component: BucketsComponent,
    options: BucketsOptions = {},
  ) {
    this.defaultScope = options.defaultScope ?? DEFAULT_SCOPE;
  }

  private scopeOf(scope?: string): string {
    return scope ?? this.defaultScope;
  }

  open(ctx: RunMutationCtx, opts: OpenOptions = {}): Promise<string> {
    return ctx.runMutation(this.component.mutations.open, {
      scope: this.scopeOf(opts.scope),
      bucketRef: opts.bucketRef,
      capacity: opts.capacity,
    });
  }

  join(
    ctx: RunMutationCtx,
    bucketRef: string,
    subjectRef: string,
    scope?: string,
  ): Promise<JoinResult> {
    return ctx.runMutation(this.component.mutations.join, {
      scope: this.scopeOf(scope),
      bucketRef,
      subjectRef,
    });
  }

  leave(
    ctx: RunMutationCtx,
    bucketRef: string,
    subjectRef: string,
    scope?: string,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.mutations.leave, {
      scope: this.scopeOf(scope),
      bucketRef,
      subjectRef,
    });
  }

  lock(
    ctx: RunMutationCtx,
    bucketRef: string,
    scope?: string,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.mutations.lock, {
      scope: this.scopeOf(scope),
      bucketRef,
    });
  }

  close(
    ctx: RunMutationCtx,
    bucketRef: string,
    scope?: string,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.mutations.close, {
      scope: this.scopeOf(scope),
      bucketRef,
    });
  }

  get(
    ctx: RunQueryCtx,
    bucketRef: string,
    scope?: string,
  ): Promise<BucketState | null> {
    return ctx.runQuery(this.component.queries.get, {
      scope: this.scopeOf(scope),
      bucketRef,
    });
  }

  paginateMembers(
    ctx: RunQueryCtx,
    bucketRef: string,
    paginationOpts: PaginationOptions,
    scope?: string,
  ): Promise<PaginationResult<MemberState>> {
    return ctx.runQuery(this.component.queries.paginateMembers, {
      bucketRef,
      paginationOpts,
      scope: this.scopeOf(scope),
    });
  }

  listMembers(
    ctx: RunQueryCtx,
    bucketRef: string,
    scope?: string,
    limit?: number,
  ): Promise<MemberState[]> {
    return ctx.runQuery(this.component.queries.listMembers, {
      bucketRef,
      limit,
      scope: this.scopeOf(scope),
    });
  }

  eraseBucket(
    ctx: RunMutationCtx,
    bucketRef: string,
    scope?: string,
    batch?: number,
  ): Promise<number> {
    return ctx.runMutation(this.component.mutations.eraseBucket, {
      batch,
      bucketRef,
      scope: this.scopeOf(scope),
    });
  }

  eraseSubject(
    ctx: RunMutationCtx,
    subjectRef: string,
    scope?: string,
    batch?: number,
  ): Promise<number> {
    return ctx.runMutation(this.component.mutations.eraseSubject, {
      batch,
      scope: this.scopeOf(scope),
      subjectRef,
    });
  }
}

export type {
  BucketState,
  BucketStatus,
  BucketsOptions,
  JoinResult,
  MemberState,
  OpenOptions,
};
