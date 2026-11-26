import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Clock, JobLock, RandomSource } from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
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
export class SchedulingModule {
  /**
   * Registers the module with options known when composing.
   * @param options Scheduling options and the logger, metrics and lock adapters.
   * @returns The global module that provides `JobRunner` and `JobLock`.
   */
  static forRoot(
    options: SchedulingModuleOptions & SchedulingModuleExtras,
  ): DynamicModule {
    return SchedulingModule.complete(
      SchedulingModuleClass.forRoot(options),
      options,
    );
  }

  /**
   * Registers the module with options built by a factory, usually from configuration.
   * @param options Factory of the scheduling options and the logger, metrics and lock adapters.
   * @returns The global module that provides `JobRunner` and `JobLock`.
   */
  static forRootAsync(
    options: SchedulingModuleAsyncOptions & SchedulingModuleExtras,
  ): DynamicModule {
    return SchedulingModule.complete(
      SchedulingModuleClass.forRootAsync(options),
      options,
    );
  }

  private static complete(
    base: DynamicModule,
    extras: SchedulingModuleExtras,
  ): DynamicModule {
    return {
      ...base,
      module: SchedulingModule,
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
      useFactory: (clock: Clock, random: RandomSource) =>
        new InProcessJobLock(clock, random),
      inject: [Clock, RandomSource],
    };
  }

  private static runnerProvider(
    loggerToken: SchedulingModuleExtras['logger'],
    metricsToken: SchedulingModuleExtras['metrics'],
  ): Provider {
    return {
      provide: JobRunner,
      useFactory: (
        clock: Clock,
        random: RandomSource,
        lock: JobLock,
        logger: LoggerPort,
        metrics: MetricsPort,
      ) => new JobRunner(clock, random, lock, logger, metrics),
      inject: [Clock, RandomSource, JobLock, loggerToken, metricsToken],
    };
  }
}
