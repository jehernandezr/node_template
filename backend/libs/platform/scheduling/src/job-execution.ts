import {
  ErrorDescriptor,
  type Clock,
  type JobLease,
  type JobLock,
  type RandomSource,
  type ScheduledJob,
} from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { Deadline, TimerScheduler } from '@platform/primitives';
import { JobLeaseLostError } from './errors/job-lease-lost.error.js';
import {
  JobRunResult,
  SchedulingMetric,
  SchedulingMetricAttribute,
} from './scheduling-metric.enum.js';

/** Signals that end a run from outside: the runner aborts the job first and stops waiting for it later. */
export interface JobExecutionSignals {
  /** Aborts the job's signal when the runner shuts down and the grace period ran out. */
  readonly shutdown: AbortSignal;
  /** Stops waiting for a job that ignored the abort: the run is abandoned and its lease left to expire. */
  readonly abandon: AbortSignal;
}

/** One run of a job: takes the lock if it is exclusive, keeps it while the job runs, applies the maximum time and measures. */
export class JobExecution {
  private static readonly RENEWALS_PER_LEASE = 3;

  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
    private readonly lock: JobLock,
    private readonly logger: LoggerPort,
    private readonly metrics: MetricsPort,
  ) {}

  /**
   * Runs the job once. An exclusive job whose lock is held by another process does not run and is
   * counted as skipped; while an exclusive job runs, its lease is renewed every third of `timeoutMs`, and
   * if a renewal finds the lease lost the job is aborted. A run that outlives its `timeoutMs` is aborted and
   * counted as failed; this call settles, and the lock is released, only once the job itself returns or
   * `signals.abandon` aborts, so a job that ignores the abort never overlaps the next run.
   * @param job Job to run.
   * @param signals Shutdown and abandon signals of the runner.
   * @returns The outcome of the run.
   * @throws The job error, `DeadlineExceededError` if it exceeded its `timeoutMs`, or `JobLeaseLostError` if
   * its lease was lost.
   */
  async execute(
    job: ScheduledJob,
    signals: JobExecutionSignals,
  ): Promise<JobRunResult> {
    const startedAt = this.clock.now();
    const runId = Buffer.from(this.random.bytes(8)).toString('hex');
    const fields = { job: job.name, runId };
    let lease: JobLease | undefined;
    let running: Promise<void> | undefined;
    let stopRenewing: () => void = () => undefined;
    try {
      if (job.exclusive) {
        lease = await this.lock.tryAcquire(job.name, job.timeoutMs);
        if (lease === undefined) {
          this.logger.debug(
            'Job skipped: another process holds the lock',
            fields,
          );
          return this.finish(job, JobRunResult.Skipped, startedAt);
        }
      }
      const leaseLost = new AbortController();
      if (lease !== undefined) {
        stopRenewing = this.keepRenewing(job, lease, leaseLost, fields);
      }
      await Deadline.after(job.timeoutMs, this.clock).race(
        (signal) => {
          running = job.run({ signal, startedAt, runId });
          return running;
        },
        AbortSignal.any([signals.shutdown, leaseLost.signal]),
      );
      return this.finish(job, JobRunResult.Succeeded, startedAt);
    } catch (error) {
      this.logger.error('Job run failed', {
        ...fields,
        error: ErrorDescriptor.describe(error),
      });
      this.finish(job, JobRunResult.Failed, startedAt);
      throw error;
    } finally {
      const returned = await this.awaitReturn(running, signals.abandon);
      stopRenewing();
      if (returned) {
        await this.releaseQuietly(lease, fields);
      } else {
        this.logger.warn(
          'Job abandoned: it ignored the abort and the runner stopped waiting for it',
          fields,
        );
      }
    }
  }

  private async awaitReturn(
    running: Promise<void> | undefined,
    abandon: AbortSignal,
  ): Promise<boolean> {
    if (running === undefined) {
      return true;
    }
    const returned = running.then(
      () => true,
      () => true,
    );
    if (abandon.aborted) {
      return Promise.race([returned, Promise.resolve(false)]);
    }
    let onAbandon: () => void = () => undefined;
    const abandoned = new Promise<boolean>((resolve) => {
      onAbandon = () => resolve(false);
      abandon.addEventListener('abort', onAbandon, { once: true });
    });
    try {
      return await Promise.race([returned, abandoned]);
    } finally {
      abandon.removeEventListener('abort', onAbandon);
    }
  }

  private keepRenewing(
    job: ScheduledJob,
    lease: JobLease,
    leaseLost: AbortController,
    fields: Record<string, unknown>,
  ): () => void {
    const everyMs = Math.max(
      1,
      Math.floor(job.timeoutMs / JobExecution.RENEWALS_PER_LEASE),
    );
    let stopped = false;
    let cancel: () => void = () => undefined;
    const renew = async (): Promise<void> => {
      const held = await this.renewQuietly(lease, job.timeoutMs, fields);
      if (stopped) {
        return;
      }
      if (!held) {
        this.logger.error('Job lost its lock while it ran', fields);
        leaseLost.abort(new JobLeaseLostError(job.name));
        return;
      }
      cancel = TimerScheduler.armDetached(everyMs, () => void renew());
    };
    cancel = TimerScheduler.armDetached(everyMs, () => void renew());
    return () => {
      stopped = true;
      cancel();
    };
  }

  private async renewQuietly(
    lease: JobLease,
    ttlMs: number,
    fields: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      return await this.lock.renew(lease, ttlMs);
    } catch (error) {
      this.logger.warn('Could not renew the job lock', {
        ...fields,
        error: ErrorDescriptor.describe(error),
      });
      return true;
    }
  }

  private finish(
    job: ScheduledJob,
    result: JobRunResult,
    startedAt: Date,
  ): JobRunResult {
    const attributes = {
      [SchedulingMetricAttribute.Job]: job.name,
      [SchedulingMetricAttribute.Result]: result,
    };
    this.metrics.increment(SchedulingMetric.Runs, attributes);
    this.metrics.record(
      SchedulingMetric.RunDuration,
      this.clock.now().getTime() - startedAt.getTime(),
      attributes,
    );
    return result;
  }

  private async releaseQuietly(
    lease: JobLease | undefined,
    fields: Record<string, unknown>,
  ): Promise<void> {
    if (lease === undefined) {
      return;
    }
    try {
      await this.lock.release(lease);
    } catch (error) {
      this.logger.warn('Could not release the job lock', {
        ...fields,
        error: ErrorDescriptor.describe(error),
      });
    }
  }
}
