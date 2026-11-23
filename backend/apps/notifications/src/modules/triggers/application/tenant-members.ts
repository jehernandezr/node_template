import type { Permission } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';

/** Los miembros de un tenant según identity. */
export abstract class TenantMembers {
  abstract withPermission(
    tenantId: string,
    permission: Permission,
  ): Promise<readonly UserRef[]>;
}
