import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { ScheduledJob } from '@platform/kernel';
import { JobRunner } from '../job-runner.js';
import { SchedulingMode } from '../scheduling-mode.enum.js';
import { SCHEDULING_OPTIONS } from './scheduling.module-definition.js';
import type { SchedulingModuleOptions } from './scheduling-module-options.js';

/**
 * Registra en el `JobRunner` todos los providers que son `ScheduledJob`, sin
 * que su módulo importe el de scheduling, y lo inicia o lo detiene con la app.
 *
 * Se detiene en `onModuleDestroy` y no en `beforeApplicationShutdown` porque Nest
 * llama a todos los `onModuleDestroy` antes: un job en curso todavía encontraría
 * cerradas las conexiones que usa. Nest destruye los módulos globales al final y
 * en orden inverso al de importación, así que `SchedulingModule` se importa
 * después de los módulos cuyos recursos usan los jobs (Valkey, AWS, persistencia).
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
