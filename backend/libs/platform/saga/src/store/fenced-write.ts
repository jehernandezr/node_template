import type { SagaInstance } from '../model/saga-instance.js';
import type { StepLogEntry } from '../model/step-log-entry.js';

/** Escritura que el almacén acepta solo si la versión y el token del lease siguen coincidiendo. */
export interface FencedWrite {
  /** Estado nuevo de la instancia. Su `version` y sus campos de lease se ignoran: el almacén los maneja. */
  readonly instance: SagaInstance;
  readonly expectedVersion: number;
  readonly leaseToken: string;
  /** Entrada de la bitácora que se escribe junto con la instancia, si hay. */
  readonly step?: StepLogEntry;
}
