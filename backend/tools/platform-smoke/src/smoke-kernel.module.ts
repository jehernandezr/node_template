import { Global, Module } from '@nestjs/common';
import {
  Clock,
  IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';

/**
 * Reloj y generador de ids para los adaptadores de la plataforma. `ObservabilityModule` no los exporta,
 * así que el servicio los provee una vez, en un módulo global.
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
