/** Shared constants used by both `client/` and `component/`. */

export const COMPONENT_NAME = "buckets";

/** Default namespace when the host does not scope a bucket. */
export const DEFAULT_SCOPE = "global";

export type BucketStatus = "open" | "locked" | "closed";
