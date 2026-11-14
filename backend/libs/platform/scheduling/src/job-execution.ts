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

/** Una corrida de un job: toma el lock si es exclusivo, aplica el tiempo máximo y mide. */
export class JobExecution {
  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
    private readonly lock: JobLock,
    private readonly logger: LoggerPort,
    private readonly metrics: MetricsPort,
  ) {}

  /**
   * Corre el job una vez. Un job exclusivo cuyo lock tiene otro proceso no corre y se
   * cuenta como omitido.
   * @param shutdown Aborta la corrida cuando el runner se apaga y se agotó la gracia.
   * @throws El error del job, o `DeadlineExceededError` si superó su `timeoutMs`.
   */
  async execute(
    job: ScheduledJob,
    shutdown: AbortSignal,
  ): Promise<JobRunResult> {
    const startedAt = this.clock.now();
    const runId = Buffer.from(this.random.bytes(8)).toString('hex');
    const fields = { job: job.name, runId };
    let lease: JobLease | undefined;
    try {
      if (job.exclusive) {
        lease = await this.lock.tryAcquire(job.name, job.timeoutMs);
        if (lease === undefined) {
          this.logger.debug('Job omitido: otro proceso tiene el lock', fields);
          return this.finish(job, JobRunResult.Skipped, startedAt);
        }
      }
      await Deadline.after(job.timeoutMs, this.clock).race(
        (signal) => job.run({ signal, startedAt, runId }),
        shutdown,
      );
      return this.finish(job, JobRunResult.Succeeded, startedAt);
    } catch (error) {
      this.logger.error('Falló la corrida del job', {
        ...fields,
        error: ErrorDescriptor.describe(error),
      });
      this.finish(job, JobRunResult.Failed, startedAt);
      throw error;
    } finally {
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
      this.logger.warn('No se pudo liberar el lock del job', {
        ...fields,
        error: ErrorDescriptor.describe(error),
      });
    }
  }
}
