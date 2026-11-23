import type { MigrationClass } from '@platform/persistence';
import { invoiceShardMigrations } from '../modules/invoices/infrastructure/persistence/migrations/index.js';
import { paymentShardMigrations } from '../modules/payments/infrastructure/persistence/migrations/index.js';
import { subscriptionShardMigrations } from '../modules/subscriptions/infrastructure/persistence/migrations/index.js';
import { usageShardMigrations } from '../modules/usage/infrastructure/persistence/migrations/index.js';

/** Migraciones de los shards de billing, en el orden de los módulos. */
export const billingShardMigrations: readonly MigrationClass[] = [
  ...subscriptionShardMigrations,
  ...usageShardMigrations,
  ...invoiceShardMigrations,
  ...paymentShardMigrations,
];
