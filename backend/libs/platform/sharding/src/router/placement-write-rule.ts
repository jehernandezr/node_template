import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { TenantStatus } from '../model/tenant-status.enum.js';

/** Decides whether a tenant's state allows writing. */
export class PlacementWriteRule {
  /**
   * @throws ShardingError `TenantMigrating` if it is migrating; `TenantNotWritable` if the status is not `Active`.
   */
  static assertWritable(tenantId: string, status: TenantStatus): void {
    if (status === TenantStatus.Active) {
      return;
    }
    if (status === TenantStatus.Migrating) {
      throw new ShardingError(
        ShardingErrorCode.TenantMigrating,
        'Tenant is migrating; writes are blocked until the move completes',
        { details: { tenantId } },
      );
    }
    throw new ShardingError(
      ShardingErrorCode.TenantNotWritable,
      'Tenant status does not allow writes',
      { details: { tenantId, status: String(status) } },
    );
  }
}
