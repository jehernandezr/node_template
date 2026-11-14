import type { DiscoveryService } from '@nestjs/core';
import { JobScheduleKind } from '@platform/kernel';
import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { InProcessJobLock } from '../../locks/in-process-job-lock.js';
import { JobRunner } from '../../job-runner.js';
import { SchedulingMode } from '../../scheduling-mode.enum.js';
import { SchedulingMetric } from '../../scheduling-metric.enum.js';
import { JobLifecycle } from '../job-lifecycle.js';
import type { SchedulingModuleOptions } from '../scheduling-module-options.js';
import {
  Eventually,
  FakeLogger,
  RecordingJob,
  RecordingJobBehavior,
  RecordingMetrics,
} from '../../__tests__/utils/index.js';

const START = new Date('2026-11-14T10:00:00.000Z');

class FakeDiscovery {
  constructor(private readonly instances: readonly unknown[]) {}

  getProviders(): { instance: unknown }[] {
    return this.instances.map((instance) => ({ instance }));
  }
}

describe('JobLifecycle', () => {
  let clock: FixedClock;
  let logger: FakeLogger;
  let metrics: RecordingMetrics;
  let runner: JobRunner;

  beforeEach(() => {
    clock = new FixedClock(START);
    logger = new FakeLogger();
    metrics = new RecordingMetrics();
    const random = new FixedRandomSource([0.5], 1);
    runner = new JobRunner(
      clock,
      random,
      new InProcessJobLock(clock, random),
      logger,
      metrics,
    );
  });

  afterEach(async () => {
    await runner.stop(0);
  });

  const lifecycleFor = (
    job: RecordingJob,
    options: Partial<SchedulingModuleOptions> = {},
  ): JobLifecycle => {
    const discovery = new FakeDiscovery([
      { job },
      {},
      undefined,
      job,
    ]) as unknown as DiscoveryService;
    return new JobLifecycle(discovery, runner, options);
  };

  describe('when the mode is External', () => {
    it('registers the job once without starting timers', async () => {
      const job = new RecordingJob({ name: 'job' });
      const lifecycle = new JobLifecycle(
        new FakeDiscovery([
          job,
          {},
          undefined,
          job,
        ]) as unknown as DiscoveryService,
        runner,
        { mode: SchedulingMode.External },
      );
      lifecycle.onApplicationBootstrap();
      await runner.runNow(job.name);
      expect(job.runs).toBe(1);
      runner.trigger(job.name);
      expect(job.runs).toBe(1);
    });
  });

  describe('when the mode is the default InProcess', () => {
    it('starts the runner so a triggered job runs', async () => {
      const job = new RecordingJob({
        name: 'job',
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const lifecycle = lifecycleFor(job);
      lifecycle.onApplicationBootstrap();
      runner.trigger(job.name);
      await Eventually.until(() => job.runs === 1);
      expect(job.runs).toBe(1);
    });

    it('aborts a hung job when the module is destroyed', async () => {
      const job = new RecordingJob({
        name: 'job',
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const lifecycle = lifecycleFor(job, { shutdownGraceMs: 5 });
      lifecycle.onApplicationBootstrap();
      runner.trigger(job.name);
      await Eventually.until(() => job.runs === 1);
      await lifecycle.onModuleDestroy();
      expect(job.abortedRuns).toBe(1);
    });

    it('resolves destroy without aborting a finished job', async () => {
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Interval, everyMs: 3_600_000 },
      });
      const lifecycle = lifecycleFor(job);
      lifecycle.onApplicationBootstrap();
      void runner.runNow(job.name);
      await lifecycle.onModuleDestroy();
      expect(job.contexts[0].signal.aborted).toBe(false);
      expect(metrics.total(SchedulingMetric.Runs)).toBe(1);
    });
  });
});
