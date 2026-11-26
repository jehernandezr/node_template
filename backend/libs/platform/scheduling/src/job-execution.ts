import {
  ErrorDescriptor,
  type Clock,
  type JobLease,
  type JobLock,
  type RandomSource,
  type ScheduledJob,
} from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { Deadline } from '@platform/primitives';
import {
  JobRunResult,
  SchedulingMetric,
  SchedulingMetricAttribute,
} from './scheduling-metric.enum.js';

/** One run of a job: takes the lock if it is exclusive, applies the maximum time and measures. */
export class JobExecution {
  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
    private readonly lock: JobLock,
    private readonly logger: LoggerPort,
    private readonly metrics: MetricsPort,
  ) {}

  /**
   * Runs the job once. An exclusive job whose lock is held by another process does not run and is
   * counted as skipped. A run that outlives its `timeoutMs` is aborted and counted as failed, and this call settles,
   * and the lock is released, only once the job itself returns, so a job that ignores the abort never overlaps the
   * next run.
   * @param shutdown Aborts the run when the runner shuts down and the grace period ran out.
   * @param job Job to run.
   * @returns The outcome of the run.
   * @throws The job error, or `DeadlineExceededError` if it exceeded its `timeoutMs`.
   */
  async execute(
    job: ScheduledJob,
    shutdown: AbortSignal,
  ): Promise<JobRunResult> {
    const startedAt = this.clock.now();
    const runId = Buffer.from(this.random.bytes(8)).toString('hex');
    const fields = { job: job.name, runId };
    let lease: JobLease | undefined;
    let running: Promise<void> | undefined;
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
      await Deadline.after(job.timeoutMs, this.clock).race((signal) => {
        running = job.run({ signal, startedAt, runId });
        return running;
      }, shutdown);
      return this.finish(job, JobRunResult.Succeeded, startedAt);
    } catch (error) {
      this.logger.error('Job run failed', {
        ...fields,
        error: ErrorDescriptor.describe(error),
      });
      this.finish(job, JobRunResult.Failed, startedAt);
      throw error;
    } finally {
      await running?.catch(() => undefined);
      await this.releaseQuietly(lease, fields);
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
