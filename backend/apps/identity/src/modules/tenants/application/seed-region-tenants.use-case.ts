import { Injectable } from '@nestjs/common';
import { TenantKind } from '@contracts/identity';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { FollowerDirectories } from '../domain/follower-directories.js';
import { TenantPlacement } from '../domain/tenant-placement.js';
import { ChangeTenantStatus } from './change-tenant-status.use-case.js';
import { ProvisionTenant } from './provision-tenant.use-case.js';
import { TenantDirectoryEntryFactory } from './tenant-directory-entry.factory.js';
import { TenantReader } from './tenant-reader.js';

/**
 * Seeds the region's two fixed tenants: the platform one and the shared customer one, where those who
 * sign up without an invitation end up. They do not go through the creation saga, so they are recorded right here in the directory
 * of the other services: it runs after deploying them. It is idempotent: it runs on every deployment.
 */
@Injectable()
export class SeedRegionTenants {
  private static readonly SHARED_SLUG = 'customers';
  private static readonly PLATFORM_SLUG = 'platform';

  constructor(
    private readonly provision: ProvisionTenant,
    private readonly status: ChangeTenantStatus,
    private readonly reader: TenantReader,
    private readonly placement: TenantPlacement,
    private readonly entries: TenantDirectoryEntryFactory,
    private readonly followers: FollowerDirectories,
    private readonly settings: IdentitySettings,
  ) {}

  /** Creates the fixed tenants of the region when they are missing; a deployment step. */
  async execute(): Promise<void> {
    const region = this.settings.values.IDENTITY_REGION;
    await this.seed(
      this.settings.values.IDENTITY_DEFAULT_TENANT_ID,
      `${SeedRegionTenants.SHARED_SLUG}-${region}`,
      TenantKind.SharedCustomers,
    );
    await this.seed(
      this.settings.values.IDENTITY_PLATFORM_TENANT_ID,
      `${SeedRegionTenants.PLATFORM_SLUG}-${region}`,
      TenantKind.Platform,
    );
  }

  private async seed(
    tenantId: string,
    slug: string,
    kind: TenantKind,
  ): Promise<void> {
    const region = this.settings.values.IDENTITY_REGION;
    if ((await this.reader.find(tenantId)) === undefined) {
      await this.provision.execute({
        tenantId,
        slug,
        name: slug,
        region,
        kind,
      });
    }
    await this.status.activate(tenantId);
    const placed = await this.placement.place(
      tenantId,
      region,
      kind === TenantKind.SharedCustomers,
    );
    await this.followers.place(this.entries.of(tenantId, placed));
  }
}
