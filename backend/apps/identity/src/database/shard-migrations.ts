import type { MigrationClass } from '@platform/persistence';
import { apiKeysShardMigrations } from '../modules/api-keys/infrastructure/persistence/migrations/index.js';
import { accessShardMigrations } from '../modules/access/infrastructure/persistence/migrations/index.js';
import { authenticationShardMigrations } from '../modules/authentication/infrastructure/persistence/migrations/index.js';
import { devicesShardMigrations } from '../modules/devices/infrastructure/persistence/migrations/index.js';
import { invitationsShardMigrations } from '../modules/invitations/infrastructure/persistence/migrations/index.js';
import { mfaShardMigrations } from '../modules/mfa/infrastructure/persistence/migrations/index.js';
import { passkeysShardMigrations } from '../modules/passkeys/infrastructure/persistence/migrations/index.js';
import { passwordsShardMigrations } from '../modules/passwords/infrastructure/persistence/migrations/index.js';
import { sessionsShardMigrations } from '../modules/sessions/infrastructure/persistence/migrations/index.js';
import { tenantsShardMigrations } from '../modules/tenants/infrastructure/persistence/migrations/index.js';
import { usersShardMigrations } from '../modules/users/infrastructure/persistence/migrations/index.js';

/** Migraciones de los shards de identity, en el orden de los módulos. */
export const identityShardMigrations: readonly MigrationClass[] = [
  ...usersShardMigrations,
  ...passwordsShardMigrations,
  ...authenticationShardMigrations,
  ...devicesShardMigrations,
  ...mfaShardMigrations,
  ...passkeysShardMigrations,
  ...sessionsShardMigrations,
  ...tenantsShardMigrations,
  ...accessShardMigrations,
  ...invitationsShardMigrations,
  ...apiKeysShardMigrations,
];
