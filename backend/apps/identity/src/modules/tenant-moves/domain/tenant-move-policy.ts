import { IdentityErrorCode, TenantKind } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { TenantSnapshot } from '../../tenants/index.js';

/** Which tenant can be moved. */
export class TenantMovePolicy {
  /**
   * The shared customer tenant and the platform tenant have data in every shard of their region, so they do not
   * fit in a single target group.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.NOT_MOVABLE` if the tenant is not an organization.
   */
  static assertMovable(tenant: TenantSnapshot): void {
    if (tenant.kind !== TenantKind.Organization) {
      throw new IdentityError(IdentityErrorCode.TenantMoveNotMovable);
    }
  }
}
