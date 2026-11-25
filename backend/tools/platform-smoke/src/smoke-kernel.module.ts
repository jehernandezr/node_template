import { Global, Module } from '@nestjs/common';
import {
  Clock,
  IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';

/**
 * Clock and id generator for the platform adapters. `ObservabilityModule` does not export them,
 * so the service provides them once, in a global module.
 */
@Global()
@Module({
  providers: [
    { provide: Clock, useFactory: () => new SystemClock() },
    {
      provide: IdGenerator,
      useFactory: (clock: Clock) => new UuidV7IdGenerator(clock),
      inject: [Clock],
    },
  ],
  exports: [Clock, IdGenerator],
})
export class SmokeKernelModule {}
