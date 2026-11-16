import type { CachePort } from '../../cache-port.js';

/** Arnés de la prueba de contrato: el puerto y la forma de avanzar su reloj. */
export interface CachePortHarness {
  readonly cache: CachePort;
  advance(ms: number): Promise<void>;
}
