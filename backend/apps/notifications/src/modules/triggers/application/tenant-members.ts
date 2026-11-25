import type { Permission } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';

/** The members of a tenant according to identity. */
export abstract class TenantMembers {
  abstract withPermission(
    tenantId: string,
    permission: Permission,
  ): Promise<readonly UserRef[]>;
}
