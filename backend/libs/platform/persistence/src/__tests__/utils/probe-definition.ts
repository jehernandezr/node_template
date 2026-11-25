import type { DatabaseSetDefinition } from '../../model/database-set-definition.js';
import { PlatformPersistenceMigrations } from '../../migrations/platform-persistence-migrations.js';
import { ProbeEntity } from './probe.entity.js';

/**
 * Sample definition of the `migration-generate` target. It does not include the `probes` table migration,
 * so the generator creates it as a pending change.
 */
const definition: DatabaseSetDefinition = {
  entities: [ProbeEntity],
  migrations: [...PlatformPersistenceMigrations.shard],
};

export default definition;
