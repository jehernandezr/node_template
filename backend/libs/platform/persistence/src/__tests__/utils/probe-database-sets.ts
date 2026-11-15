import type { DatabaseSetDefinition } from '../../model/database-set-definition.js';
import { PlatformPersistenceMigrations } from '../../migrations/platform-persistence-migrations.js';
import { CreateProbes1794700000001 } from './create-probes.migration.js';
import { ProbeEntity } from './probe.entity.js';

/** Conjuntos de entidades y migraciones listos para `ShardedTestDatabase`. */
export class ProbeDatabaseSets {
  /** Los shards llevan las funciones y `audit_log` de la plataforma más la tabla `probes`. */
  static readonly shard: DatabaseSetDefinition = {
    entities: [ProbeEntity],
    migrations: [
      ...PlatformPersistenceMigrations.shard,
      CreateProbes1794700000001,
    ],
  };

  /** El catálogo no lleva tablas de prueba. */
  static readonly catalog: DatabaseSetDefinition = {
    entities: [],
    migrations: [],
  };
}
