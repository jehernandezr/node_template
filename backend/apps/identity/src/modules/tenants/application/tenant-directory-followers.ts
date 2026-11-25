import { BillingTenantDirectoryOperations } from '@contracts/billing';
import { NotificationsTenantDirectoryOperations } from '@contracts/notifications';
import type { TenantDirectoryOperations } from '@contracts/platform';
import { ReportsTenantDirectoryOperations } from '@contracts/reports';
import { TasksTenantDirectoryOperations } from '@contracts/tasks';

/**
 * The services that store a tenant's data and route it with their own shard directory, in the order in which
 * creation places them. Billing goes last because the step after it opens its account.
 */
export class TenantDirectoryFollowers {
  static readonly ALL: readonly TenantDirectoryOperations[] = [
    TasksTenantDirectoryOperations,
    NotificationsTenantDirectoryOperations,
    ReportsTenantDirectoryOperations,
    BillingTenantDirectoryOperations,
  ];
}
