import type { IdGenerator } from '@platform/kernel';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/** Opciones de `ValkeyBloomFilter`. */
export interface ValkeyBloomFilterOptions {
  /** Nombre del filtro, normalmente un valor del enum de filtros del llamador. */
  readonly name: string;
  readonly expectedItems: number;
  /** Por defecto `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE` (1 %). */
  readonly falsePositiveRate?: number;
  /**
   * Con `false` (por defecto) el módulo agrega subfiltros cuando el filtro
   * crece más allá de `expectedItems` y conserva la tasa. Con `true` el filtro
   * se niega a crecer más allá de su capacidad.
   */
  readonly nonScaling?: boolean;
  /** El filtro vive en `<prefijo>:bloom:{nombre}`, dentro de la ACL del usuario del servicio. */
  readonly keyspace: ValkeyKeyspace;
  /** Nombra las llaves temporales de una reconstrucción. */
  readonly ids: IdGenerator;
}
