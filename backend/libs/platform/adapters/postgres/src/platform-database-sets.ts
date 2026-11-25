import {
  PlatformPersistenceMigrations,
  type EntityClass,
  type MigrationClass,
} from '@platform/persistence';
import { CreatePlatformCatalogTables1794800001101 } from './migrations/catalog/1794800001101-CreatePlatformCatalogTables.js';
import { CreateCatalogIdempotencyKeys1794800001102 } from './migrations/catalog/1794800001102-CreateCatalogIdempotencyKeys.js';
import { AddCatalogIdempotencyKeyTenant1794800001103 } from './migrations/catalog/1794800001103-AddCatalogIdempotencyKeyTenant.js';
import { CreatePlatformShardTables1794800001001 } from './migrations/shard/1794800001001-CreatePlatformShardTables.js';
import { CreateTenantWriteFences1794800001002 } from './migrations/shard/1794800001002-CreateTenantWriteFences.js';
import { CreateTenantMoveCheckpoints1794800001003 } from './migrations/shard/1794800001003-CreateTenantMoveCheckpoints.js';
import { AddIdempotencyKeyTenant1794800001004 } from './migrations/shard/1794800001004-AddIdempotencyKeyTenant.js';
import { AddProcessedMessageTenant1794800001005 } from './migrations/shard/1794800001005-AddProcessedMessageTenant.js';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity.js';
import { OutboxEntity } from './entities/outbox.entity.js';
import { ProcessedMessageEntity } from './entities/processed-message.entity.js';
import { ShardDirectoryEntity } from './entities/shard-directory.entity.js';
import { ShardInstanceEntity } from './entities/shard-instance.entity.js';
import { ShardLockEntity } from './entities/shard-lock.entity.js';
import { TenantMoveCheckpointEntity } from './entities/tenant-move-checkpoint.entity.js';
import { TenantWriteFenceEntity } from './entities/tenant-write-fence.entity.js';

/** Entities of the platform tables that live in each shard database. The app adds them to its own. */
export const platformShardEntities: readonly EntityClass[] = [
  OutboxEntity,
  ProcessedMessageEntity,
  IdempotencyKeyEntity,
  TenantWriteFenceEntity,
  TenantMoveCheckpointEntity,
];

/**
 * Entities of the platform tables that live in the global catalog. `idempotency_keys` is also
 * here for services with `requireScope`, whose internal operations choose their shard in the handler.
 */
export const platformCatalogEntities: readonly EntityClass[] = [
  ShardDirectoryEntity,
  ShardInstanceEntity,
  ShardLockEntity,
  IdempotencyKeyEntity,
];

/** Migrations of each shard: the functions and `audit_log` of `@platform/persistence` and the platform tables. */
export const platformShardMigrations: readonly MigrationClass[] = [
  ...PlatformPersistenceMigrations.shard,
  CreatePlatformShardTables1794800001001,
  CreateTenantWriteFences1794800001002,
  CreateTenantMoveCheckpoints1794800001003,
  AddIdempotencyKeyTenant1794800001004,
  AddProcessedMessageTenant1794800001005,
];

/** Migrations of the global catalog. */
export const platformCatalogMigrations: readonly MigrationClass[] = [
  CreatePlatformCatalogTables1794800001101,
  CreateCatalogIdempotencyKeys1794800001102,
  AddCatalogIdempotencyKeyTenant1794800001103,
];
