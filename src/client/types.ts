/** Public TypeScript surface for the buckets client. */

export type BucketStatus = "closed" | "locked" | "open";

export type BucketState = {
  bucketRef: string;
  capacity?: number;
  closedAt?: number;
  lockedAt?: number;
  memberCount: number;
  openedAt: number;
  status: BucketStatus;
};

export type MemberState = {
  joinedAt: number;
  subjectRef: string;
};

export type JoinResult = {
  joined: boolean;
  reason?: string;
};

export type BucketsOptions = {
  defaultScope?: string;
};

export type OpenOptions = {
  bucketRef?: string;
  capacity?: number;
  scope?: string;
};
