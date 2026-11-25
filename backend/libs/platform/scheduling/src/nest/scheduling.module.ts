import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  Clock,
  JobLock,
  RandomSource,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { NoopMetrics } from '@platform/observability';
import { InvalidArgumentError } from '@platform/primitives';
import { InProcessJobLock } from '../locks/in-process-job-lock.js';
import { JobRunner } from '../job-runner.js';
import { JobLifecycle } from './job-lifecycle.js';
import {
  SchedulingModuleClass,
  type SchedulingModuleAsyncOptions,
} from './scheduling.module-definition.js';
import type {
  SchedulingModuleExtras,
  SchedulingModuleOptions,
} from './scheduling-module-options.js';

/**
 * Provides `JobRunner` and `JobLock`, and registers the `ScheduledJob`s that other
 * modules declare. It is global because it is registered once at the root and the libraries
 * inject `JobRunner` without importing this module.
 */
@Module({})
export class SchedulingModule extends SchedulingModuleClass {
  static override forRoot(
    options: SchedulingModuleOptions & SchedulingModuleExtras,
  ): DynamicModule {
    return SchedulingModule.complete(super.forRoot(options), options);
  }

  static override forRootAsync(
    options: SchedulingModuleAsyncOptions & SchedulingModuleExtras,
  ): DynamicModule {
    return SchedulingModule.complete(super.forRootAsync(options), options);
  }

  /** @throws InvalidArgumentError when `logger` is missing. */
  private static complete(
    base: DynamicModule,
    extras: SchedulingModuleExtras,
  ): DynamicModule {
    if (extras.logger === undefined) {
      throw new InvalidArgumentError(
        'logger',
        'the LoggerPort implementation used by the JobRunner',
      );
    }
    return {
      ...base,
      global: true,
      imports: [...(base.imports ?? []), DiscoveryModule],
      providers: [
        ...(base.providers ?? []),
        SchedulingModule.lockProvider(extras),
        SchedulingModule.runnerProvider(extras.logger, extras.metrics),
        JobLifecycle,
      ],
      exports: [JobRunner, JobLock],
    };
  }

  private static lockProvider(extras: SchedulingModuleExtras): Provider {
    if (extras.lock !== undefined) {
      return { provide: JobLock, useExisting: extras.lock };
    }
    return {
      provide: JobLock,
      useFactory: (clock?: Clock, random?: RandomSource) =>
        new InProcessJobLock(
          clock ?? new SystemClock(),
          random ?? new SystemRandomSource(),
        ),
      inject: [
        { token: Clock, optional: true },
        { token: RandomSource, optional: true },
      ],
    };
  }

  private static runnerProvider(
    loggerToken: NonNullable<SchedulingModuleExtras['logger']>,
    metricsToken: SchedulingModuleExtras['metrics'],
  ): Provider {
    const optionalMetrics = metricsToken === undefined ? [] : [metricsToken];
    return {
      provide: JobRunner,
      useFactory: (
        clock: Clock | undefined,
        random: RandomSource | undefined,
        lock: JobLock,
        logger: LoggerPort,
        metrics?: MetricsPort,
      ) =>
        new JobRunner(
          clock ?? new SystemClock(),
          random ?? new SystemRandomSource(),
          lock,
          logger,
          metrics ?? new NoopMetrics(),
        ),
      inject: [
        { token: Clock, optional: true },
        { token: RandomSource, optional: true },
        JobLock,
        loggerToken,
        ...optionalMetrics,
      ],
    };
  }
}
