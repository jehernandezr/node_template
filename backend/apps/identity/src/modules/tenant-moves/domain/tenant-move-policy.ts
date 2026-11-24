import { IdentityErrorCode, TenantKind } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { TenantSnapshot } from '../../tenants/index.js';

/** Qué tenant se puede trasladar. */
export class TenantMovePolicy {
  /**
   * El tenant compartido de clientes y el de plataforma tienen datos en todos los shards de su región, así que no
   * caben en un solo grupo de destino.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.NOT_MOVABLE` si el tenant no es una organización.
   */
  static assertMovable(tenant: TenantSnapshot): void {
    if (tenant.kind !== TenantKind.Organization) {
      throw new IdentityError(IdentityErrorCode.TenantMoveNotMovable);
    }
  }
}
