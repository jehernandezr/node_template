import { BillingTenantDirectoryOperations } from '@contracts/billing';
import { NotificationsTenantDirectoryOperations } from '@contracts/notifications';
import type { TenantDirectoryOperations } from '@contracts/platform';
import { ReportsTenantDirectoryOperations } from '@contracts/reports';
import { TasksTenantDirectoryOperations } from '@contracts/tasks';

/**
 * Los servicios que guardan datos de un tenant y lo enrutan con su propio directorio de shards, en el orden en que
 * el alta los ubica. Billing va último porque el paso que le sigue abre su cuenta.
 */
export class TenantDirectoryFollowers {
  static readonly ALL: readonly TenantDirectoryOperations[] = [
    TasksTenantDirectoryOperations,
    NotificationsTenantDirectoryOperations,
    ReportsTenantDirectoryOperations,
    BillingTenantDirectoryOperations,
  ];
}
