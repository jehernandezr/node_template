import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { ScheduledJob } from '@platform/kernel';
import { JobRunner } from '../job-runner.js';
import { SchedulingMode } from '../scheduling-mode.enum.js';
import { SCHEDULING_OPTIONS } from './scheduling.module-definition.js';
import type { SchedulingModuleOptions } from './scheduling-module-options.js';

/**
 * Registers in the `JobRunner` all the providers that are `ScheduledJob`, without
 * their module importing the scheduling one, and starts or stops it with the app.
 *
 * It stops in `onModuleDestroy` and not in `beforeApplicationShutdown` because Nest
 * calls all the `onModuleDestroy` hooks first: a running job would still find
 * the connections it uses closed. Nest destroys global modules last and
 * in reverse import order, so `SchedulingModule` is imported
 * after the modules whose resources the jobs use (Valkey, AWS, persistence).
 */
@Injectable()
export class JobLifecycle implements OnApplicationBootstrap, OnModuleDestroy {
  private static readonly DEFAULT_GRACE_MS = 10_000;

  private readonly registered = new Set<ScheduledJob>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly runner: JobRunner,
    @Inject(SCHEDULING_OPTIONS)
    private readonly options: SchedulingModuleOptions,
  ) {}

  onApplicationBootstrap(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (instance instanceof ScheduledJob && !this.registered.has(instance)) {
        this.registered.add(instance);
        this.runner.register(instance);
      }
    }
    if (
      (this.options.mode ?? SchedulingMode.InProcess) ===
      SchedulingMode.InProcess
    ) {
      this.runner.start();
    }
  }

  onModuleDestroy(): Promise<void> {
    return this.runner.stop(
      this.options.shutdownGraceMs ?? JobLifecycle.DEFAULT_GRACE_MS,
    );
  }
}
