import type { MigrationClass } from '@platform/persistence';
import { CreateInvoices1796200400000 } from './1796200400000-CreateInvoices.js';
import { ScheduleInvoiceCollection1796200400001 } from './1796200400001-ScheduleInvoiceCollection.js';

export const invoiceShardMigrations: readonly MigrationClass[] = [
  CreateInvoices1796200400000,
  ScheduleInvoiceCollection1796200400001,
];
