import type { Permission } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';

/** The members of a tenant according to identity. */
export abstract class TenantMembers {
  /**
   * Lists the members of a tenant that hold a permission.
   * @param tenantId Tenant to read.
   * @param permission Permission they must hold.
   * @returns The members.
   */
  abstract withPermission(
    tenantId: string,
    permission: Permission,
  ): Promise<readonly UserRef[]>;
}
