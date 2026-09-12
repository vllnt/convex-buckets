import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
} from "convex/server";

import { DEFAULT_SCOPE } from "../shared.js";

import type {
  BucketsOptions,
  BucketState,
  JoinResult,
  MemberState,
  OpenOptions,
} from "./types.js";

export type BucketsComponent = {
  mutations: {
    close: FunctionReference<
      "mutation",
      "internal",
      { bucketRef: string; scope: string },
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
    join: FunctionReference<
      "mutation",
      "internal",
      { bucketRef: string; scope: string; subjectRef: string },
      JoinResult
    >;
    leave: FunctionReference<
      "mutation",
      "internal",
      { bucketRef: string; scope: string; subjectRef: string },
      boolean
    >;
    lock: FunctionReference<
      "mutation",
      "internal",
      { bucketRef: string; scope: string },
      boolean
    >;
    open: FunctionReference<
      "mutation",
      "internal",
      { bucketRef?: string; capacity?: number; scope: string },
      string
    >;
  };
  queries: {
    get: FunctionReference<
      "query",
      "internal",
      { bucketRef: string; scope: string },
      BucketState | null
    >;
    listMembers: FunctionReference<
      "query",
      "internal",
      { bucketRef: string; limit?: number; scope: string },
      MemberState[]
    >;
    paginateMembers: FunctionReference<
      "query",
      "internal",
      { bucketRef: string; paginationOpts: PaginationOptions; scope: string },
      PaginationResult<MemberState>
    >;
  };
};

type RunQueryCtx = {
  runQuery<TQuery extends FunctionReference<"query", "internal">>(
    reference: TQuery,
    arguments_: FunctionArgs<TQuery>,
  ): Promise<FunctionReturnType<TQuery>>;
};

type RunMutationCtx = {
  runMutation<TMutation extends FunctionReference<"mutation", "internal">>(
    reference: TMutation,
    arguments_: FunctionArgs<TMutation>,
  ): Promise<FunctionReturnType<TMutation>>;
};

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

  open(ctx: RunMutationCtx, options: OpenOptions = {}): Promise<string> {
    return ctx.runMutation(this.component.mutations.open, {
      bucketRef: options.bucketRef,
      capacity: options.capacity,
      scope: this.scopeOf(options.scope),
    });
  }

  // eslint-disable-next-line max-params -- Preserve the existing positional public API.
  join(
    ctx: RunMutationCtx,
    bucketRef: string,
    subjectRef: string,
    scope?: string,
  ): Promise<JoinResult> {
    return ctx.runMutation(this.component.mutations.join, {
      bucketRef,
      scope: this.scopeOf(scope),
      subjectRef,
    });
  }

  // eslint-disable-next-line max-params -- Preserve the existing positional public API.
  leave(
    ctx: RunMutationCtx,
    bucketRef: string,
    subjectRef: string,
    scope?: string,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.mutations.leave, {
      bucketRef,
      scope: this.scopeOf(scope),
      subjectRef,
    });
  }

  lock(
    ctx: RunMutationCtx,
    bucketRef: string,
    scope?: string,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.mutations.lock, {
      bucketRef,
      scope: this.scopeOf(scope),
    });
  }

  close(
    ctx: RunMutationCtx,
    bucketRef: string,
    scope?: string,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.mutations.close, {
      bucketRef,
      scope: this.scopeOf(scope),
    });
  }

  get(
    ctx: RunQueryCtx,
    bucketRef: string,
    scope?: string,
  ): Promise<BucketState | null> {
    return ctx.runQuery(this.component.queries.get, {
      bucketRef,
      scope: this.scopeOf(scope),
    });
  }

  // eslint-disable-next-line max-params -- Preserve the existing positional public API.
  paginateMembers(
    ctx: RunQueryCtx,
    bucketRef: string,
    paginationOptions: PaginationOptions,
    scope?: string,
  ): Promise<PaginationResult<MemberState>> {
    return ctx.runQuery(this.component.queries.paginateMembers, {
      bucketRef,
      paginationOpts: paginationOptions,
      scope: this.scopeOf(scope),
    });
  }

  // eslint-disable-next-line max-params -- Preserve the existing positional public API.
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

  // eslint-disable-next-line max-params -- Preserve the existing positional public API.
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

  // eslint-disable-next-line max-params -- Preserve the existing positional public API.
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

export {
  type BucketsOptions,
  type BucketState,
  type BucketStatus,
  type JoinResult,
  type MemberState,
  type OpenOptions,
} from "./types.js";
