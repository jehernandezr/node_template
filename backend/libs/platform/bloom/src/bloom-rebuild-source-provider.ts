import type { BloomRebuildSource } from './bloom-rebuild-source.js';

/**
 * Entrega la fuente de verdad de un filtro. Cada llamada devuelve una fuente nueva, leída desde la
 * base de datos o el servicio dueño de los datos.
 */
export abstract class BloomRebuildSourceProvider {
  abstract batches(signal?: AbortSignal): BloomRebuildSource;
}
