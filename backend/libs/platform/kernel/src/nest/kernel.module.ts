import { Global, Module } from '@nestjs/common';
import { UuidV7IdGenerator } from '../ids/uuid-v7-id-generator.js';
import { IdGenerator } from '../ids/id-generator.js';
import { RandomSource } from '../random/random-source.js';
import { SystemRandomSource } from '../random/system-random-source.js';
import { Clock } from '../time/clock.js';
import { SystemClock } from '../time/system-clock.js';

/**
 * The clock, the randomness and the id generator of the process. It is global and imported once at the root, so every
 * library module and business module injects the same instances and none of them builds its own.
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
export class KernelModule {}
