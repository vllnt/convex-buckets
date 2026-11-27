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

/**
 * Shape of the mounted component reference, `components.buckets` in the host's
 * `convex/_generated/api`. Pass it to `new Buckets(...)`.
 */
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

/**
 * Host-side client for one mounted buckets component. Call its methods from
 * host Convex mutations and queries after authorizing the caller; the
 * component never reads auth. Every method takes an optional `scope`, which
 * defaults to `defaultScope` (`"global"`).
 *
 * @see https://oss.vllnt.com/packages/convex-buckets
 */
export class Buckets {
  private readonly defaultScope: string;

  /**
   * @param component - The mounted component, e.g. `components.buckets`.
   * @param options - `defaultScope`, the scope for calls that pass none.
   */
  constructor(
    private readonly component: BucketsComponent,
    options: BucketsOptions = {},
  ) {
    this.defaultScope = options.defaultScope ?? DEFAULT_SCOPE;
  }

  private scopeOf(scope?: string): string {
    return scope ?? this.defaultScope;
  }

  /**
   * Creates an `open` bucket and returns its `bucketRef` (generated when you
   * pass none). Throws `ConvexError` `INVALID_REF`, `INVALID_CAPACITY` or
   * `BUCKET_EXISTS`.
   */
  open(ctx: RunMutationCtx, options: OpenOptions = {}): Promise<string> {
    return ctx.runMutation(this.component.mutations.open, {
      bucketRef: options.bucketRef,
      capacity: options.capacity,
      scope: this.scopeOf(options.scope),
    });
  }

  /**
   * Adds `subjectRef` to an `open` bucket. Returns `{ joined: true }`, or
   * `{ joined: false, reason }` with `missing`, `locked`, `closed`,
   * `already_member` or `full`; it does not throw for these.
   */
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

  /**
   * Removes `subjectRef` from an `open` or `locked` bucket. Returns `false`
   * when the bucket is missing or closed, or the subject is not a member.
   */
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

  /**
   * Stops new joins (`open` -> `locked`). Returns `false` unless the bucket
   * was `open`.
   */
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

  /**
   * Closes the bucket for good (`open` or `locked` -> `closed`). Returns
   * `false` when the bucket does not exist or was already closed.
   */
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

  /** Returns the bucket's state, or `null` when no such bucket exists. */
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

  /**
   * Returns one page of members in join order. Start with
   * `{ cursor: null, numItems }` (1..500) and pass `continueCursor` until
   * `isDone`.
   */
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

  /**
   * Returns up to `limit` members (default 100; a limit above 500 reads
   * 500). It does not say whether more exist; use `paginateMembers` for all
   * members.
   */
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

  /**
   * Closes the bucket, deletes up to `batch` members (default 200, max 500)
   * and schedules the rest. Returns the rows this call deleted, not the
   * total. Erasure has finished when `get` returns `null`.
   */
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

  /**
   * Deletes up to `batch` of the subject's memberships in the scope (default
   * 200, max 500) and schedules nothing. Repeat until it returns `0`.
   */
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
