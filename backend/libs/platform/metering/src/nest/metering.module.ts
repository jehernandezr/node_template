import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { LoggerPort, RequestContextStore } from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { BufferedUsageRecorder } from '../buffered-usage-recorder.js';
import { InMemoryUsageCounterStore } from '../in-memory-usage-counter-store.js';
import { UsageCounterStore } from '../usage-counter-store.js';
import { UsageFlushJob } from '../usage-flush.job.js';
import { UsageRecorder } from '../usage-recorder.js';
import { UsageWindowClock } from '../usage-window-clock.js';
import { ApiCallMeteringInterceptor } from './api-call-metering.interceptor.js';
import type { MeteringModuleOptions } from './metering-module-options.js';

/**
 * Usage metering toward billing: counts the API calls of service accounts, offers `UsageRecorder`
 * to the use cases and runs `UsageFlushJob`, which `SchedulingModule` discovers. The service declares the
 * billing contract among its peers so the topology knows the command queue.
 */
@Module({})
export class MeteringModule {
  static forRoot(options: MeteringModuleOptions): DynamicModule {
    return {
      module: MeteringModule,
      global: true,
      providers: [
        MeteringModule.countersProvider(options),
        {
          provide: UsageWindowClock,
          useFactory: (clock: Clock) => new UsageWindowClock(clock),
          inject: [Clock],
        },
        {
          provide: UsageRecorder,
          useFactory: (
            counters: UsageCounterStore,
            windows: UsageWindowClock,
          ) => new BufferedUsageRecorder(counters, windows),
          inject: [UsageCounterStore, UsageWindowClock],
        },
        {
          provide: UsageFlushJob,
          useFactory: (
            counters: UsageCounterStore,
            windows: UsageWindowClock,
            bus: MessageBus,
            transactions: TransactionManager,
            scope: ShardScope,
            context: RequestContextStore,
            logger: LoggerPort,
          ) =>
            new UsageFlushJob({
              service: options.service,
              counters,
              windows,
              bus,
              transactions,
              scope,
              context,
              logger,
            }),
          inject: [
            UsageCounterStore,
            UsageWindowClock,
            MessageBus,
            TransactionManager,
            ShardScope,
            RequestContextStore,
            LoggerPort,
          ],
        },
        { provide: APP_INTERCEPTOR, useClass: ApiCallMeteringInterceptor },
      ],
      exports: [UsageRecorder, UsageFlushJob],
    };
  }

  private static countersProvider(options: MeteringModuleOptions): Provider {
    return options.counters === undefined
      ? {
          provide: UsageCounterStore,
          useValue: new InMemoryUsageCounterStore(),
        }
      : { provide: UsageCounterStore, useExisting: options.counters };
  }
}
