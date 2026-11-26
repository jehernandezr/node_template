import type { Permission } from '@contracts/identity';
import { ApiKeysFacade } from '../../application/api-keys.facade.js';

/** The API keys facade in memory: it remembers the region of each tenant and the active service accounts. */
export class InMemoryApiKeysFacade extends ApiKeysFacade {
  private readonly regions = new Map<string, string>();
  private readonly accounts = new Map<string, readonly Permission[]>();

  override async relocateTenant(
    tenantId: string,
    region: string,
  ): Promise<void> {
    this.regions.set(tenantId, region);
  }

  override async activeServicePermissions(
    tenantId: string,
    serviceAccountId: string,
  ): Promise<readonly Permission[] | undefined> {
    return this.accounts.get(`${tenantId}:${serviceAccountId}`);
  }

  /**
   * Adds an active service account.
   * @param tenantId Tenant.
   * @param serviceAccountId Service account.
   * @param permissions Its permissions.
   * @returns This facade.
   */
  withServiceAccount(
    tenantId: string,
    serviceAccountId: string,
    permissions: readonly Permission[],
  ): this {
    this.accounts.set(`${tenantId}:${serviceAccountId}`, permissions);
    return this;
  }

  /**
   * Reads where the prefixes of a tenant point.
   * @param tenantId Tenant.
   * @returns The region, if relocated.
   */
  regionOfTenant(tenantId: string): string | undefined {
    return this.regions.get(tenantId);
  }
}
