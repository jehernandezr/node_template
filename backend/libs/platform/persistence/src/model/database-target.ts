import type { DatabaseKind } from './database-kind.enum.js';

/** Una base lógica en una instancia física: lo que identifica un `DataSource`. */
export interface DatabaseTarget {
  readonly kind: DatabaseKind;
  /** Nombre de la instancia física, tal como la entrega el directorio. */
  readonly instance: string;
  /** Nombre de la base: el id del shard lógico, o el nombre del catálogo. */
  readonly database: string;
}
