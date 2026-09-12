/** Shared constants used by both `client/` and `component/`. */

export const COMPONENT_NAME = "buckets";

/** Default namespace when the host does not scope a bucket. */
export const DEFAULT_SCOPE = "global";

export const MAX_REF_LENGTH = 256;
export const DEFAULT_ERASE_BATCH = 200;
export const MAX_ERASE_BATCH = 500;
export const DEFAULT_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 500;

export type BucketStatus = "closed" | "locked" | "open";

export function clampEraseBatch(batch: number): number {
  if (!Number.isInteger(batch) || batch < 1) {
    throw new Error("INVALID_BATCH: batch must be a positive integer");
  }
  return Math.min(batch, MAX_ERASE_BATCH);
}

export function clampListLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("INVALID_LIMIT: limit must be a positive integer");
  }
  return Math.min(limit, MAX_LIST_LIMIT);
}
