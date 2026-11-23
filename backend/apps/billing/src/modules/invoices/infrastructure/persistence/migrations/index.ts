import type { MigrationClass } from '@platform/persistence';
import { CreateInvoices1796200400000 } from './1796200400000-CreateInvoices.js';

export const invoiceShardMigrations: readonly MigrationClass[] = [
  CreateInvoices1796200400000,
];
