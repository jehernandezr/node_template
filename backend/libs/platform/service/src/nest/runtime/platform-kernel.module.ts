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
 * Reloj, aleatoriedad y generador de ids del proceso. Es global porque las tablas de la plataforma
 * (`PostgresPlatformModule`) y `UseCaseRunner` los inyectan y ningún módulo de librería los exporta.
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
