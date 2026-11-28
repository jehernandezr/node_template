import { DatabaseAuth, DatabaseConfigKeys } from '@platform/persistence/config';
import { DATABASE_CONFIG_FORMAT_VERSION } from './export-constants.js';
import type { JsonObject } from './json.type.js';

/**
 * Builds `database-config.json`: the variables of `databaseConfigSchema` a deployment sets for each `DB_AUTH`. The
 * `service-base` stack test reads it, so the `DB_*` keys Terraform emits match the code schema (ADR 0041).
 */
export class DatabaseConfigExportBuilder {
  /**
   * The keys of each authentication mode.
   * @returns The JSON value of the artifact.
   */
  build(): JsonObject {
    return {
      formatVersion: DATABASE_CONFIG_FORMAT_VERSION,
      keys: Object.fromEntries(
        Object.values(DatabaseAuth).map((auth) => [
          auth,
          DatabaseConfigKeys.of(auth),
        ]),
      ),
    };
  }
}
