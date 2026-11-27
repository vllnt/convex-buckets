/** Shared constants used by both `client/` and `component/`. */

/** Default namespace when the host does not scope a bucket. */
export const DEFAULT_SCOPE = "global";

/** Longest allowed scope, bucket or subject ref, in UTF-16 code units. */
export const MAX_REF_LENGTH = 256;
/** Default `batch` for `eraseBucket` and `eraseSubject`. */
export const DEFAULT_ERASE_BATCH = 200;
/** Erase batches above this use this value. */
export const MAX_ERASE_BATCH = 500;
/** Default `limit` for `listMembers`. */
export const DEFAULT_LIST_LIMIT = 100;
/** `listMembers` limits above this use this value; also the largest `numItems`. */
export const MAX_LIST_LIMIT = 500;
