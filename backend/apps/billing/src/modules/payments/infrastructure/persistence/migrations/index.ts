import type { MigrationClass } from '@platform/persistence';
import { CreatePaymentAttempts1796200500000 } from './1796200500000-CreatePaymentAttempts.js';

export const paymentShardMigrations: readonly MigrationClass[] = [
  CreatePaymentAttempts1796200500000,
];
