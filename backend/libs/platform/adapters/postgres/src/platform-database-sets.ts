import {
  PlatformPersistenceMigrations,
  type EntityClass,
  type MigrationClass,
} from '@platform/persistence';
import { CreatePlatformCatalogTables1794800001101 } from './migrations/catalog/1794800001101-CreatePlatformCatalogTables.js';
import { CreatePlatformShardTables1794800001001 } from './migrations/shard/1794800001001-CreatePlatformShardTables.js';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity.js';
import { OutboxEntity } from './entities/outbox.entity.js';
import { ProcessedMessageEntity } from './entities/processed-message.entity.js';
import { ShardDirectoryEntity } from './entities/shard-directory.entity.js';
import { ShardInstanceEntity } from './entities/shard-instance.entity.js';
import { ShardLockEntity } from './entities/shard-lock.entity.js';

/** Entidades de las tablas de la plataforma que viven en cada base de shard. La app las suma a las suyas. */
export const platformShardEntities: readonly EntityClass[] = [
  OutboxEntity,
  ProcessedMessageEntity,
  IdempotencyKeyEntity,
];

/** Entidades de las tablas de la plataforma que viven en el catálogo global. */
export const platformCatalogEntities: readonly EntityClass[] = [
  ShardDirectoryEntity,
  ShardInstanceEntity,
  ShardLockEntity,
];

/** Migraciones de cada shard: las funciones y `audit_log` de `@platform/persistence` y las tablas de la plataforma. */
export const platformShardMigrations: readonly MigrationClass[] = [
  ...PlatformPersistenceMigrations.shard,
  CreatePlatformShardTables1794800001001,
];

/** Migraciones del catálogo global. */
export const platformCatalogMigrations: readonly MigrationClass[] = [
  CreatePlatformCatalogTables1794800001101,
];
