/** Public TypeScript surface for the buckets client. */

/** Lifecycle state: `open` -> `locked` -> `closed` (terminal). */
export type BucketStatus = "closed" | "locked" | "open";

/** A bucket as returned by `get`. Timestamps are milliseconds since epoch. */
export type BucketState = {
  bucketRef: string;
  capacity?: number;
  closedAt?: number;
  lockedAt?: number;
  memberCount: number;
  openedAt: number;
  status: BucketStatus;
};

/** One member as returned by `listMembers` and `paginateMembers`. */
export type MemberState = {
  joinedAt: number;
  subjectRef: string;
};

/**
 * Result of `join`. When `joined` is `false`, `reason` is one of `missing`,
 * `locked`, `closed`, `already_member` or `full`.
 */
export type JoinResult = {
  joined: boolean;
  reason?: string;
};

/** Options for `new Buckets(component, options)`. */
export type BucketsOptions = {
  /** Scope used when a method gets none. Default `"global"`. */
  defaultScope?: string;
};

/** Options for `open`. */
export type OpenOptions = {
  /** 1..256 characters, unique in the scope. Generated when omitted. */
  bucketRef?: string;
  /** Member limit, a positive safe integer. Leave it out for no limit. */
  capacity?: number;
  /** Defaults to the client's `defaultScope`. */
  scope?: string;
};
