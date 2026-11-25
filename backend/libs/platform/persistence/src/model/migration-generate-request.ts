import type { DatabaseSetDefinition } from './database-set-definition.js';
import type { DatabaseEndpoint } from './database-endpoint.js';

/** Data to generate a migration by comparing the entities with a temporary database. */
export interface MigrationGenerateRequest {
  /** Name in PascalCase, without the timestamp. */
  readonly name: string;
  /** Folder where the file is written (the service's `migrations/shard` or `migrations/catalog`). */
  readonly outputDir: string;
  /** Current entities and the existing migrations, to bring the temporary database to the previous state. */
  readonly definition: DatabaseSetDefinition;
  /** PostgreSQL server where the temporary database is created and dropped. */
  readonly server: DatabaseEndpoint;
  readonly user: string;
  readonly password: string;
}
