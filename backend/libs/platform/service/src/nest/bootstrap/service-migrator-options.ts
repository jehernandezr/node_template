import type { ConfigEnv } from '@platform/config';

/** Opciones de `ServiceMigrator.run`. */
export interface ServiceMigratorOptions {
  /** Por defecto `process.env`. */
  readonly env?: ConfigEnv;
}
