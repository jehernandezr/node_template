import type { JobContext } from '../../ports/scheduling/job-context.js';

/** Run contexts to call `ScheduledJob.run()` directly in a test. */
export class JobContexts {
  private static readonly STARTED_AT = new Date('2026-01-01T00:00:00.000Z');

  /** A run in progress, which nobody aborts. */
  static live(runId = 'test-run'): JobContext {
    return {
      signal: new AbortController().signal,
      startedAt: JobContexts.STARTED_AT,
      runId,
    };
  }

  /** A run whose deadline already expired: the job must stop at the next safe point. */
  static aborted(runId = 'test-run'): JobContext {
    return {
      signal: AbortSignal.abort(),
      startedAt: JobContexts.STARTED_AT,
      runId,
    };
  }
}
