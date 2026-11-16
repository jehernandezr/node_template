import { Global, Module } from '@nestjs/common';
import { ResilienceRegistry } from '@platform/resilience';

/** Registro de resiliencia real, disponible de forma global para las pruebas del módulo. */
@Global()
@Module({
  providers: [
    { provide: ResilienceRegistry, useFactory: () => new ResilienceRegistry() },
  ],
  exports: [ResilienceRegistry],
})
export class ResilienceTestModule {}
