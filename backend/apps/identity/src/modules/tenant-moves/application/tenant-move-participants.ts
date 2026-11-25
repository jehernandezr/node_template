import { BillingTenantMoveOperations } from '@contracts/billing';
import { IdentityTenantMoveOperations } from '@contracts/identity';
import { NotificationsTenantMoveOperations } from '@contracts/notifications';
import type { TenantMoveOperations } from '@contracts/platform';
import { ReportsTenantMoveOperations } from '@contracts/reports';
import { TasksTenantMoveOperations } from '@contracts/tasks';

/** The services that store a tenant's data, in the order in which the saga moves them. */
export class TenantMoveParticipants {
  static readonly ALL: readonly TenantMoveOperations[] = [
    IdentityTenantMoveOperations,
    TasksTenantMoveOperations,
    NotificationsTenantMoveOperations,
    ReportsTenantMoveOperations,
    BillingTenantMoveOperations,
  ];
}
