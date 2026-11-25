import type { DatabaseKind } from './database-kind.enum.js';

/** A logical database on a physical instance: what identifies a `DataSource`. */
export interface DatabaseTarget {
  readonly kind: DatabaseKind;
  /** Name of the physical instance, as provided by the directory. */
  readonly instance: string;
  /** Name of the database: the logical shard id, or the catalog name. */
  readonly database: string;
}
