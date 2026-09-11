/** Public TypeScript surface for the buckets client. */

export type BucketStatus = "open" | "locked" | "closed";

export interface BucketState {
  bucketRef: string;
  status: BucketStatus;
  capacity?: number;
  memberCount: number;
  openedAt: number;
  lockedAt?: number;
  closedAt?: number;
}

export interface MemberState {
  subjectRef: string;
  joinedAt: number;
}

export interface JoinResult {
  joined: boolean;
  reason?: string;
}

export interface BucketsOptions {
  defaultScope?: string;
}

export interface OpenOptions {
  scope?: string;
  bucketRef?: string;
  capacity?: number;
}
