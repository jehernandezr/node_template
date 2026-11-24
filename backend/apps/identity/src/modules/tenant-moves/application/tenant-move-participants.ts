import { BillingTenantMoveOperations } from '@contracts/billing';
import { IdentityTenantMoveOperations } from '@contracts/identity';
import { NotificationsTenantMoveOperations } from '@contracts/notifications';
import type { TenantMoveOperations } from '@contracts/platform';
import { ReportsTenantMoveOperations } from '@contracts/reports';
import { TasksTenantMoveOperations } from '@contracts/tasks';

/** Los servicios que guardan datos de un tenant, en el orden en que la saga los traslada. */
export class TenantMoveParticipants {
  static readonly ALL: readonly TenantMoveOperations[] = [
    IdentityTenantMoveOperations,
    TasksTenantMoveOperations,
    NotificationsTenantMoveOperations,
    ReportsTenantMoveOperations,
    BillingTenantMoveOperations,
  ];
}
