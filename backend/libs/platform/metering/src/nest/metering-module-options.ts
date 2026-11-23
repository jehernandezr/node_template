import type { Type } from '@nestjs/common';
import type { UsageCounterStore } from '../usage-counter-store.js';

/** Opciones de `MeteringModule.forRoot`. */
export interface MeteringModuleOptions {
  /** Nombre del servicio que mide; encabeza las llaves de idempotencia de lo que envía. */
  readonly service: string;
  /**
   * Contadores compartidos por las instancias, por ejemplo `ValkeyUsageCounterStore`. Sin valor, contadores
   * en el proceso.
   */
  readonly counters?: Type<UsageCounterStore>;
}
