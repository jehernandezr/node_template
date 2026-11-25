import type { Deadline } from '@platform/primitives';

/** How long a caller may wait. Never affects other callers. */
export interface CallerWaitOptions {
  /** The caller stops waiting and rejects with the signal's reason when it aborts. */
  readonly signal?: AbortSignal;
  /** The caller stops waiting and rejects with `DeadlineExceededError` when the deadline expires. */
  readonly deadline?: Deadline;
}
