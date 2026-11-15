import type { DatabaseSetDefinition } from '../../model/database-set-definition.js';
import { PlatformPersistenceMigrations } from '../../migrations/platform-persistence-migrations.js';
import { ProbeEntity } from './probe.entity.js';

/**
 * Definición de ejemplo del target `migration-generate`. No lleva la migración de la tabla `probes`,
 * así que el generador la crea como cambio pendiente.
 */
const definition: DatabaseSetDefinition = {
  entities: [ProbeEntity],
  migrations: [...PlatformPersistenceMigrations.shard],
};

export default definition;
