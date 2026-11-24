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
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity.js';
import { OutboxEntity } from './entities/outbox.entity.js';
import { ProcessedMessageEntity } from './entities/processed-message.entity.js';
import { ShardDirectoryEntity } from './entities/shard-directory.entity.js';
import { ShardInstanceEntity } from './entities/shard-instance.entity.js';
import { ShardLockEntity } from './entities/shard-lock.entity.js';
import { TenantMoveCheckpointEntity } from './entities/tenant-move-checkpoint.entity.js';
import { TenantWriteFenceEntity } from './entities/tenant-write-fence.entity.js';

/** Entidades de las tablas de la plataforma que viven en cada base de shard. La app las suma a las suyas. */
export const platformShardEntities: readonly EntityClass[] = [
  OutboxEntity,
  ProcessedMessageEntity,
  IdempotencyKeyEntity,
  TenantWriteFenceEntity,
  TenantMoveCheckpointEntity,
];

/**
 * Entidades de las tablas de la plataforma que viven en el catálogo global. `idempotency_keys` está también
 * aquí para los servicios con `requireScope`, cuyas operaciones internas eligen su shard en el handler.
 */
export const platformCatalogEntities: readonly EntityClass[] = [
  ShardDirectoryEntity,
  ShardInstanceEntity,
  ShardLockEntity,
  IdempotencyKeyEntity,
];

/** Migraciones de cada shard: las funciones y `audit_log` de `@platform/persistence` y las tablas de la plataforma. */
export const platformShardMigrations: readonly MigrationClass[] = [
  ...PlatformPersistenceMigrations.shard,
  CreatePlatformShardTables1794800001001,
  CreateTenantWriteFences1794800001002,
  CreateTenantMoveCheckpoints1794800001003,
  AddIdempotencyKeyTenant1794800001004,
];

/** Migraciones del catálogo global. */
export const platformCatalogMigrations: readonly MigrationClass[] = [
  CreatePlatformCatalogTables1794800001101,
  CreateCatalogIdempotencyKeys1794800001102,
  AddCatalogIdempotencyKeyTenant1794800001103,
];
