import type { ConfigEnv } from '@platform/config';

/** Options of `ServiceMigrator.run`. */
export interface ServiceMigratorOptions {
  /** `process.env` by default. */
  readonly env?: ConfigEnv;
}
