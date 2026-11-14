import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { DeadlineExceededError } from '@platform/primitives';
import { JobExecution } from '../job-execution.js';
import {
  JobRunResult,
  SchedulingMetric,
  SchedulingMetricAttribute,
} from '../scheduling-metric.enum.js';
import {
  Eventually,
  FakeLogLevel,
  FakeLogger,
  InMemoryTestLock,
  RecordingJob,
  RecordingJobBehavior,
  RecordingMetrics,
} from './utils/index.js';

const START = new Date('2026-11-14T10:00:00.000Z');
const HEX = /^[0-9a-f]+$/;

describe('JobExecution', () => {
  let clock: FixedClock;
  let lock: InMemoryTestLock;
  let logger: FakeLogger;
  let metrics: RecordingMetrics;
  let shutdown: AbortController;
  let execution: JobExecution;

  beforeEach(() => {
    clock = new FixedClock(START);
    lock = new InMemoryTestLock();
    logger = new FakeLogger();
    metrics = new RecordingMetrics();
    shutdown = new AbortController();
    execution = new JobExecution(
      clock,
      new FixedRandomSource([0.5], 1),
      lock,
      logger,
      metrics,
    );
  });

  describe('when a job succeeds', () => {
    it('reports Succeeded and counts the run', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      await expect(execution.execute(job, shutdown.signal)).resolves.toBe(
        JobRunResult.Succeeded,
      );
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Job]: 'job-a',
          [SchedulingMetricAttribute.Result]: JobRunResult.Succeeded,
        }),
      ).toBe(1);
      expect(metrics.records.map((record) => record.name)).toContain(
        SchedulingMetric.RunDuration,
      );
    });

    it('gives the job a hexadecimal run id and the clock start time', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      await execution.execute(job, shutdown.signal);
      const [context] = job.contexts;
      expect(context.runId).toMatch(HEX);
      expect(context.startedAt).toEqual(START);
    });
  });

  describe('when a job fails', () => {
    it('rethrows the job error and counts the failure', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        behavior: RecordingJobBehavior.Fail,
      });
      await expect(execution.execute(job, shutdown.signal)).rejects.toThrow(
        'job failed',
      );
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Result]: JobRunResult.Failed,
        }),
      ).toBe(1);
      expect(logger.levels()).toContain(FakeLogLevel.Error);
    });
  });

  describe('when the job is exclusive', () => {
    it('skips the run when another process holds the lock', async () => {
      lock.held = true;
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await expect(execution.execute(job, shutdown.signal)).resolves.toBe(
        JobRunResult.Skipped,
      );
      expect(job.runs).toBe(0);
      expect(lock.releases).toBe(0);
      expect(lock.held).toBe(true);
    });

    it('releases the lock after a successful run', async () => {
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await execution.execute(job, shutdown.signal);
      expect(lock.held).toBe(false);
      expect(lock.releases).toBe(1);
    });

    it('releases the lock after a failed run', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        exclusive: true,
        behavior: RecordingJobBehavior.Fail,
      });
      await expect(execution.execute(job, shutdown.signal)).rejects.toThrow(
        'job failed',
      );
      expect(lock.held).toBe(false);
      expect(lock.releases).toBe(1);
    });

    it('reports Succeeded and warns when the release fails', async () => {
      lock.failRelease = true;
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await expect(execution.execute(job, shutdown.signal)).resolves.toBe(
        JobRunResult.Succeeded,
      );
      expect(logger.levels()).toContain(FakeLogLevel.Warn);
    });
  });

  describe('when the job is not exclusive', () => {
    it('does not touch the lock', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      await execution.execute(job, shutdown.signal);
      expect(lock.releases).toBe(0);
    });
  });

  describe('when the job exceeds its timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects with a deadline error and aborts the job signal', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        timeoutMs: 5,
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const outcome = expect(
        execution.execute(job, shutdown.signal),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
      await jest.advanceTimersByTimeAsync(5);
      await outcome;
      expect(job.contexts[0].signal.aborted).toBe(true);
    });
  });

  describe('when the runner shuts down during a run', () => {
    it('rejects with the shutdown reason and aborts the job', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const outcome = expect(
        execution.execute(job, shutdown.signal),
      ).rejects.toThrow('apagado');
      await Eventually.until(() => job.runs === 1);
      shutdown.abort(new Error('apagado'));
      await outcome;
      expect(job.abortedRuns).toBe(1);
    });
  });
});
