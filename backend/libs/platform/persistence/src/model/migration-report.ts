/** Qué hizo `ShardedMigrationRunner` en una base. */
export interface MigrationReport {
  /** Nombre de la base: el id del shard o el del catálogo. */
  readonly database: string;
  /** Nombres de las migraciones que se aplicaron en esta corrida (vacío si ya estaba al día). */
  readonly applied: readonly string[];
}
