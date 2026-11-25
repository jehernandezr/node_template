import type { Permission } from '@contracts/identity';

/** What `api-keys` offers to the other modules. */
export abstract class ApiKeysFacade {
  /**
   * Points the prefix index of the tenant to `region` after relocating it. It is idempotent.
   * @param tenantId Relocated tenant.
   * @param region New region.
   */
  abstract relocateTenant(tenantId: string, region: string): Promise<void>;

  /**
   * Reads the permissions of an active service account of the tenant.
   * @param tenantId Tenant.
   * @param serviceAccountId Service account.
   * @returns Its permissions, or `undefined` if it does not exist or is disabled.
   */
  abstract activeServicePermissions(
    tenantId: string,
    serviceAccountId: string,
  ): Promise<readonly Permission[] | undefined>;
}
