import { Global, Module } from '@nestjs/common';
import {
  Clock,
  IdGenerator,
  RandomSource,
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { ResilienceModule } from '@platform/resilience/nest';
import { InMemoryProcessedOperationStore } from '../../../__tests__/utils/in-memory-processed-operation-store.js';

/**
 * What `InternalApiModule` expects from the service, without real configuration or
 * telemetry: clock, ids, traces and `ResilienceRegistry`. It is imported in
 * module tests together with `InternalApiModule.forRoot`, with
 * `InMemoryProcessedOperationStore` as `processedStore`.
 */
@Global()
@Module({
  imports: [ResilienceModule.forRoot()],
  providers: [
    { provide: Clock, useFactory: () => new SystemClock() },
    { provide: RandomSource, useFactory: () => new SystemRandomSource() },
    {
      provide: IdGenerator,
      useFactory: (clock: Clock, random: RandomSource) =>
        new UuidV7IdGenerator(clock, random),
      inject: [Clock, RandomSource],
    },
    {
      provide: Tracing,
      useFactory: () => new Tracing(new Redactor()),
    },
    {
      provide: TraceContextRestorer,
      useFactory: (tracing: Tracing) => new TraceContextRestorer(tracing),
      inject: [Tracing],
    },
    {
      provide: InMemoryProcessedOperationStore,
      useFactory: (clock: Clock, ids: IdGenerator) =>
        new InMemoryProcessedOperationStore(clock, ids),
      inject: [Clock, IdGenerator],
    },
  ],
  exports: [
    Clock,
    RandomSource,
    IdGenerator,
    Tracing,
    TraceContextRestorer,
    InMemoryProcessedOperationStore,
  ],
})
export class InternalApiPlatformTestingModule {}
