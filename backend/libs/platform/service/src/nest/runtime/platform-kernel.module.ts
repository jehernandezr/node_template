import { Global, Module } from '@nestjs/common';
import {
  Clock,
  IdGenerator,
  RandomSource,
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';

/**
 * Clock, randomness and id generator of the process. It is global because the platform tables
 * (`PostgresPlatformModule`) and `UseCaseRunner` inject them and no library module exports them.
 */
@Global()
@Module({
  providers: [
    { provide: Clock, useFactory: () => new SystemClock() },
    { provide: RandomSource, useFactory: () => new SystemRandomSource() },
    {
      provide: IdGenerator,
      useFactory: (clock: Clock, random: RandomSource) =>
        new UuidV7IdGenerator(clock, random),
      inject: [Clock, RandomSource],
    },
  ],
  exports: [Clock, RandomSource, IdGenerator],
})
export class PlatformKernelModule {}
