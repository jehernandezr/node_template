import { KernelModule } from '@platform/kernel/nest';
import {
  Global,
  Module,
  type DynamicModule,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { JobScheduleKind, JobLock, type JobLease } from '@platform/kernel';
import { JobRunner } from '../../job-runner.js';
import { InProcessJobLock } from '../../locks/in-process-job-lock.js';
import { SchedulingMode } from '../../scheduling-mode.enum.js';
import {
  JobRunResult,
  SchedulingMetric,
  SchedulingMetricAttribute,
} from '../../scheduling-metric.enum.js';
import { SchedulingModule } from '../scheduling.module.js';
import {
  Eventually,
  FakeLogger,
  RecordingJob,
  RecordingJobBehavior,
  RecordingMetrics,
} from '../../__tests__/utils/index.js';
import { TestObservabilityModule } from './utils/test-observability.module.js';

class TestJobLock extends JobLock {
  async tryAcquire(name: string): Promise<JobLease | undefined> {
    return { name, token: 'test-lock' };
  }

  async release(): Promise<void> {
    return undefined;
  }
}

@Global()
@Module({
  providers: [TestJobLock],
  exports: [TestJobLock],
})
class TestLockModule {}

/** Resource that a job uses and that its module closes on destroy, such as a network client. */
class ClosingResource implements OnModuleDestroy {
  abortedRunsSeenAtClose: number | undefined;

  constructor(private readonly job: RecordingJob) {}

  onModuleDestroy(): void {
    this.abortedRunsSeenAtClose = this.job.abortedRuns;
  }
}

@Module({})
class ResourceModule {
  static global(resource: ClosingResource): DynamicModule {
    return {
      module: ResourceModule,
      global: true,
      providers: [{ provide: ClosingResource, useFactory: () => resource }],
      exports: [ClosingResource],
    };
  }
}

describe('SchedulingModule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    jest.useRealTimers();
    await moduleRef?.close();
    moduleRef = undefined;
  });

  describe('when jobs are declared by another module', () => {
    it('discovers them without importing SchedulingModule', async () => {
      class JobAToken {}
      class JobBToken {}
      class RunnerConsumer {}
      const jobA = new RecordingJob({ name: 'job-a' });
      const jobB = new RecordingJob({ name: 'job-b' });

      @Module({
        providers: [
          { provide: JobAToken, useValue: jobA },
          { provide: JobBToken, useValue: jobB },
          {
            provide: RunnerConsumer,
            useFactory: (runner: JobRunner) => runner,
            inject: [JobRunner],
          },
        ],
      })
      class JobsModule {}

      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            mode: SchedulingMode.External,
            logger: FakeLogger,
            metrics: RecordingMetrics,
          }),
          JobsModule,
        ],
      }).compile();
      await moduleRef.init();

      const runner = moduleRef.get(JobRunner);
      await runner.runNow('job-a');
      await runner.runNow('job-b');
      expect(jobA.runs).toBe(1);
      expect(jobB.runs).toBe(1);
      expect(moduleRef.get(RunnerConsumer)).toBe(runner);
    });
  });

  describe('when the mode is External', () => {
    it('arms no timers', async () => {
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Interval, everyMs: 10 },
      });
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            mode: SchedulingMode.External,
            logger: FakeLogger,
            metrics: RecordingMetrics,
          }),
        ],
        providers: [{ provide: RecordingJob, useValue: job }],
      }).compile();
      jest.useFakeTimers();
      await moduleRef.init();
      await jest.advanceTimersByTimeAsync(100);
      expect(job.runs).toBe(0);
    });
  });

  describe('when the mode is the default InProcess', () => {
    it('starts the runner so timers run the job', async () => {
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Interval, everyMs: 50 },
      });
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            logger: FakeLogger,
            metrics: RecordingMetrics,
          }),
        ],
        providers: [{ provide: RecordingJob, useValue: job }],
      }).compile();
      jest.useFakeTimers();
      await moduleRef.init();
      await jest.advanceTimersByTimeAsync(60);
      expect(job.runs).toBe(1);
    });

    it('stops the runner and aborts hung jobs on close', async () => {
      jest.useRealTimers();
      const job = new RecordingJob({
        name: 'job',
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            logger: FakeLogger,
            metrics: RecordingMetrics,
            shutdownGraceMs: 5,
          }),
        ],
        providers: [{ provide: RecordingJob, useValue: job }],
      }).compile();
      await moduleRef.init();
      moduleRef.get(JobRunner).trigger(job.name);
      await Eventually.until(() => job.runs === 1);
      await moduleRef.close();
      moduleRef = undefined;
      expect(job.abortedRuns).toBe(1);
    });
  });

  describe('when the app closes with a global resource imported earlier', () => {
    it('stops the jobs before the resource closes', async () => {
      const job = new RecordingJob({
        name: 'job',
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const resource = new ClosingResource(job);
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          ResourceModule.global(resource),
          SchedulingModule.forRoot({
            logger: FakeLogger,
            metrics: RecordingMetrics,
            shutdownGraceMs: 5,
          }),
        ],
        providers: [{ provide: RecordingJob, useValue: job }],
      }).compile();
      await moduleRef.init();
      moduleRef.get(JobRunner).trigger(job.name);
      await Eventually.until(() => job.runs === 1);

      await moduleRef.close();
      moduleRef = undefined;

      expect(resource.abortedRunsSeenAtClose).toBe(1);
    });
  });

  describe('when the options come from an async factory', () => {
    it('wires the runner, the lock and the mode from the factory', async () => {
      const job = new RecordingJob({
        name: 'job',
        schedule: { kind: JobScheduleKind.Interval, everyMs: 10 },
      });
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestLockModule,
          TestObservabilityModule,
          SchedulingModule.forRootAsync({
            useFactory: () => ({ mode: SchedulingMode.External }),
            logger: FakeLogger,
            metrics: RecordingMetrics,
            lock: TestJobLock,
          }),
        ],
        providers: [{ provide: RecordingJob, useValue: job }],
      }).compile();
      jest.useFakeTimers();
      await moduleRef.init();

      await jest.advanceTimersByTimeAsync(100);
      await moduleRef.get(JobRunner).runNow(job.name);

      expect(job.runs).toBe(1);
      expect(moduleRef.get(JobLock)).toBeInstanceOf(TestJobLock);
    });
  });

  describe('when the lock is configured', () => {
    it('provides InProcessJobLock by default', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            mode: SchedulingMode.External,
            logger: FakeLogger,
            metrics: RecordingMetrics,
          }),
        ],
      }).compile();
      expect(moduleRef.get(JobLock)).toBeInstanceOf(InProcessJobLock);
    });

    it('provides the configured lock class', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestLockModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            mode: SchedulingMode.External,
            logger: FakeLogger,
            metrics: RecordingMetrics,
            lock: TestJobLock,
          }),
        ],
      }).compile();
      expect(moduleRef.get(JobLock)).toBeInstanceOf(TestJobLock);
    });
  });

  describe('when metrics are configured', () => {
    it('records each run in the configured metrics', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestObservabilityModule,
          SchedulingModule.forRoot({
            mode: SchedulingMode.External,
            logger: FakeLogger,
            metrics: RecordingMetrics,
          }),
        ],
        providers: [{ provide: RecordingJob, useValue: job }],
      }).compile();
      await moduleRef.init();
      await moduleRef.get(JobRunner).runNow(job.name);
      const metrics = moduleRef.get(RecordingMetrics);
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Result]: JobRunResult.Succeeded,
        }),
      ).toBe(1);
    });
  });
});
