import { JobScheduleKind, type JobLock } from '@platform/kernel';
import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { SchedulingErrorCode } from '../errors/scheduling-error-code.enum.js';
import { InProcessJobLock } from '../locks/in-process-job-lock.js';
import { JobRunner } from '../job-runner.js';
import {
  JobRunResult,
  SchedulingMetric,
  SchedulingMetricAttribute,
} from '../scheduling-metric.enum.js';
import {
  Eventually,
  FakeLogger,
  RecordingJob,
  RecordingJobBehavior,
  RecordingMetrics,
} from './utils/index.js';

const START = new Date('2026-11-14T10:00:00.000Z');
const HOUR_MS = 3_600_000;
const HUNG_JOB = RecordingJobBehavior.HangUntilAborted;

interface RunnerFixture {
  readonly runner: JobRunner;
  readonly metrics: RecordingMetrics;
}

describe('JobRunner', () => {
  const runners: JobRunner[] = [];

  afterEach(async () => {
    jest.useRealTimers();
    await Promise.all(runners.splice(0).map((runner) => runner.stop(0)));
  });

  const createRunner = (
    options: { clock?: FixedClock; lock?: JobLock } = {},
  ): RunnerFixture => {
    const clock = options.clock ?? new FixedClock(START);
    const random = new FixedRandomSource([0.5], 1);
    const metrics = new RecordingMetrics();
    const lock = options.lock ?? new InProcessJobLock(clock, random);
    const runner = new JobRunner(
      clock,
      random,
      lock,
      new FakeLogger(),
      metrics,
    );
    runners.push(runner);
    return { runner, metrics };
  };

  describe('when registering jobs', () => {
    it('rejects a second job with the same name as duplicate', () => {
      const { runner } = createRunner();
      runner.register(new RecordingJob({ name: 'job' }));
      expect(() => runner.register(new RecordingJob({ name: 'job' }))).toThrow(
        expect.objectContaining({ code: SchedulingErrorCode.DuplicateJob }),
      );
    });

    it.each([
      [
        'an interval of 0',
        new RecordingJob({
          name: 'job',
          schedule: { kind: JobScheduleKind.Interval, everyMs: 0 },
        }),
      ],
      ['a timeout of 0', new RecordingJob({ name: 'job', timeoutMs: 0 })],
    ])('rejects %s as an invalid schedule', (_description, job) => {
      const { runner } = createRunner();
      expect(() => runner.register(job)).toThrow(
        expect.objectContaining({ code: SchedulingErrorCode.InvalidSchedule }),
      );
    });

    it('rejects a cron that does not parse as an invalid cron', () => {
      const { runner } = createRunner();
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Cron, expression: 'bad' },
      });
      expect(() => runner.register(job)).toThrow(
        expect.objectContaining({
          code: SchedulingErrorCode.InvalidCronExpression,
        }),
      );
    });
  });

  describe('when a name is unknown', () => {
    it('rejects runNow and throws on trigger with the runner stopped', async () => {
      const { runner } = createRunner();
      await expect(runner.runNow('nope')).rejects.toMatchObject({
        code: SchedulingErrorCode.UnknownJob,
      });
      expect(() => runner.trigger('nope')).toThrow(
        expect.objectContaining({ code: SchedulingErrorCode.UnknownJob }),
      );
    });

    it('rejects runNow and throws on trigger with the runner started', async () => {
      const { runner } = createRunner();
      runner.start();
      await expect(runner.runNow('nope')).rejects.toMatchObject({
        code: SchedulingErrorCode.UnknownJob,
      });
      expect(() => runner.trigger('nope')).toThrow(
        expect.objectContaining({ code: SchedulingErrorCode.UnknownJob }),
      );
    });
  });

  describe('when running a job on demand', () => {
    it('runs the job once and waits for it', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({ name: 'job' });
      runner.register(job);
      await runner.runNow('job');
      expect(job.runs).toBe(1);
    });

    it('rejects with the job error and runs again on the next call', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({
        name: 'job',
        behavior: RecordingJobBehavior.Fail,
      });
      runner.register(job);
      await expect(runner.runNow('job')).rejects.toThrow('job failed');
      await expect(runner.runNow('job')).rejects.toThrow('job failed');
      expect(job.runs).toBe(2);
    });

    it('shares the run when called twice while it is in progress', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({ name: 'job', behavior: HUNG_JOB });
      runner.register(job);
      const first = runner.runNow('job');
      const second = runner.runNow('job');
      await Eventually.until(() => job.runs === 1);
      expect(job.runs).toBe(1);
      await runner.stop(0);
      await expect(first).rejects.toThrow();
      await expect(second).rejects.toThrow();
    });
  });

  describe('when a job is exclusive', () => {
    it('does not run it in a second runner while the first one holds the lock', async () => {
      const clock = new FixedClock(START);
      const random = new FixedRandomSource([0.5], 1);
      const lock = new InProcessJobLock(clock, random);
      const first = createRunner({ clock, lock });
      const second = createRunner({ clock, lock });
      const jobFirst = new RecordingJob({
        name: 'exclusive',
        exclusive: true,
        behavior: HUNG_JOB,
      });
      const jobSecond = new RecordingJob({
        name: 'exclusive',
        exclusive: true,
        behavior: HUNG_JOB,
      });
      first.runner.register(jobFirst);
      second.runner.register(jobSecond);

      const firstRun = first.runner.runNow('exclusive');
      await Eventually.until(() => jobFirst.runs === 1);
      await second.runner.runNow('exclusive');
      expect(jobSecond.runs).toBe(0);
      expect(
        second.metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Result]: JobRunResult.Skipped,
        }),
      ).toBe(1);

      await first.runner.stop(0);
      expect(jobFirst.abortedRuns).toBe(1);
      await expect(firstRun).rejects.toThrow();

      const secondRun = second.runner.runNow('exclusive');
      await Eventually.until(() => jobSecond.runs === 1);
      await second.runner.stop(0);
      await expect(secondRun).rejects.toThrow();
    });
  });

  describe('when stopping', () => {
    it('lets a finished job complete without aborting it', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({ name: 'job' });
      runner.register(job);
      void runner.runNow('job');
      await runner.stop(1000);
      expect(job.contexts[0].signal.aborted).toBe(false);
    });

    it('waits for a run in progress that finishes within the grace period', async () => {
      const { runner, metrics } = createRunner();
      const job = new RecordingJob({
        name: 'job',
        behavior: RecordingJobBehavior.WaitForRelease,
      });
      runner.register(job);
      const run = runner.runNow('job');
      await Eventually.until(() => job.runs === 1);

      let stopResolved = false;
      const stopped = runner.stop(60_000).then(() => {
        stopResolved = true;
      });
      await new Promise((resolve) => setImmediate(resolve));
      expect(stopResolved).toBe(false);
      job.release();
      await stopped;

      await expect(run).resolves.toBeUndefined();
      expect(job.contexts[0].signal.aborted).toBe(false);
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Result]: JobRunResult.Succeeded,
        }),
      ).toBe(1);
    });

    it('aborts a hung job once the grace period expires', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({ name: 'job', behavior: HUNG_JOB });
      runner.register(job);
      const run = runner.runNow('job');
      await Eventually.until(() => job.runs === 1);
      await runner.stop(10);
      expect(job.abortedRuns).toBe(1);
      await expect(run).rejects.toThrow();
    });

    it('resolves immediately when nothing is running', async () => {
      const { runner } = createRunner();
      runner.register(new RecordingJob({ name: 'job' }));
      await expect(runner.stop(1000)).resolves.toBeUndefined();
    });

    it('schedules no runs after stop with fake timers', async () => {
      jest.useFakeTimers();
      const { runner } = createRunner();
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Interval, everyMs: 100 },
      });
      runner.register(job);
      runner.start();
      await runner.stop(0);
      await jest.advanceTimersByTimeAsync(1000);
      expect(job.runs).toBe(0);
    });
  });

  describe('when triggering a job', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('runs once for two triggers in a row', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({ name: 'job' });
      runner.register(job);
      runner.start();
      runner.trigger('job');
      runner.trigger('job');
      await jest.advanceTimersByTimeAsync(1);
      expect(job.runs).toBe(1);
    });

    it('does not duplicate a run while the job is in progress', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({ name: 'job', behavior: HUNG_JOB });
      runner.register(job);
      runner.start();
      runner.trigger('job');
      await jest.advanceTimersByTimeAsync(1);
      expect(job.runs).toBe(1);
      runner.trigger('job');
      await jest.advanceTimersByTimeAsync(1);
      expect(job.runs).toBe(1);
    });

    it('runs nothing while the runner is not started', async () => {
      const { runner } = createRunner();
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Interval, everyMs: HOUR_MS },
      });
      runner.register(job);
      runner.trigger('job');
      await jest.advanceTimersByTimeAsync(HOUR_MS + 1);
      expect(job.runs).toBe(0);
    });
  });

  describe('when a job runs on its interval', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const everyHundredMs = (behavior?: RecordingJobBehavior): RecordingJob =>
      new RecordingJob({
        name: 'job',
        behavior,
        schedule: { kind: JobScheduleKind.Interval, everyMs: 100 },
      });

    it('runs at each interval', async () => {
      const { runner } = createRunner();
      const job = everyHundredMs();
      runner.register(job);
      runner.start();
      await jest.advanceTimersByTimeAsync(350);
      expect(job.runs).toBe(3);
    });

    it('does not double the schedule when started twice', async () => {
      const { runner } = createRunner();
      const job = everyHundredMs();
      runner.register(job);
      runner.start();
      runner.start();
      await jest.advanceTimersByTimeAsync(350);
      expect(job.runs).toBe(3);
    });

    it('does not overlap a hung run with itself', async () => {
      const { runner } = createRunner();
      const job = everyHundredMs(HUNG_JOB);
      runner.register(job);
      runner.start();
      await jest.advanceTimersByTimeAsync(1000);
      expect(job.runs).toBe(1);
    });

    it('keeps the schedule after a failed run', async () => {
      const { runner } = createRunner();
      const job = everyHundredMs(RecordingJobBehavior.Fail);
      runner.register(job);
      runner.start();
      await jest.advanceTimersByTimeAsync(350);
      expect(job.runs).toBe(3);
    });

    it('starts a job registered after start at its first interval', async () => {
      const { runner } = createRunner();
      runner.start();
      const job = everyHundredMs();
      runner.register(job);
      await jest.advanceTimersByTimeAsync(100);
      expect(job.runs).toBe(1);
    });
  });

  describe('when a job runs on a cron', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('runs at the next minute boundary', async () => {
      const { runner } = createRunner({
        clock: new FixedClock(new Date('2026-11-14T10:00:00.000Z')),
      });
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Cron, expression: '*/1 * * * *' },
      });
      runner.register(job);
      runner.start();
      await jest.advanceTimersByTimeAsync(59_999);
      expect(job.runs).toBe(0);
      await jest.advanceTimersByTimeAsync(1);
      expect(job.runs).toBe(1);
    });
  });
});
