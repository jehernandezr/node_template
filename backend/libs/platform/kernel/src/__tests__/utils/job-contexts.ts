import type { JobContext } from '../../ports/scheduling/job-context.js';

/** Contextos de corrida para llamar a `ScheduledJob.run()` directo en una prueba. */
export class JobContexts {
  private static readonly STARTED_AT = new Date('2026-01-01T00:00:00.000Z');

  /** Una corrida en curso, que nadie aborta. */
  static live(runId = 'test-run'): JobContext {
    return {
      signal: new AbortController().signal,
      startedAt: JobContexts.STARTED_AT,
      runId,
    };
  }

  /** Una corrida cuyo plazo ya venció: el job debe parar en el siguiente punto seguro. */
  static aborted(runId = 'test-run'): JobContext {
    return {
      signal: AbortSignal.abort(),
      startedAt: JobContexts.STARTED_AT,
      runId,
    };
  }
}
