import type { DatabaseSetDefinition } from '../../model/database-set-definition.js';
import { PlatformPersistenceMigrations } from '../../migrations/platform-persistence-migrations.js';
import { CreateProbes1794700000001 } from './create-probes.migration.js';
import { ProbeEntity } from './probe.entity.js';

/** Sets of entities and migrations ready for `ShardedTestDatabase`. */
export class ProbeDatabaseSets {
  /** The shards carry the platform functions and `audit_log` plus the `probes` table. */
  static readonly shard: DatabaseSetDefinition = {
    entities: [ProbeEntity],
    migrations: [
      ...PlatformPersistenceMigrations.shard,
      CreateProbes1794700000001,
    ],
  };

  /** The catalog has no test tables. */
  static readonly catalog: DatabaseSetDefinition = {
    entities: [],
    migrations: [],
  };
}
