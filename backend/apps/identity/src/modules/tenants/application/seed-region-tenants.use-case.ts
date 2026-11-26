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
 * sign up without an invitation end up. Outside production it also seeds the smoke tenant the deploy smoke tests sign
 * in to, in the shared customer group. They do not go through the creation saga, so they are recorded right here in
 * the directory of the other services: it runs after deploying them. It is idempotent: it runs on every deployment.
 */
@Injectable()
export class SeedRegionTenants {
  private static readonly SHARED_SLUG = 'customers';
  private static readonly PLATFORM_SLUG = 'platform';
  private static readonly SMOKE_SLUG = 'smoke';

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
      true,
    );
    await this.seed(
      this.settings.values.IDENTITY_PLATFORM_TENANT_ID,
      `${SeedRegionTenants.PLATFORM_SLUG}-${region}`,
      TenantKind.Platform,
      false,
    );
  }

  /**
   * Places the smoke tenant in the region's shared customer group of identity, so its owner can be created in its
   * shard before the tenant exists.
   * @param tenantId Smoke tenant.
   */
  async placeSmokeTenant(tenantId: string): Promise<void> {
    await this.placement.place(
      tenantId,
      this.settings.values.IDENTITY_REGION,
      true,
    );
  }

  /**
   * Creates the smoke tenant with its owner when it is missing, activates it and records it in every service, like
   * the fixed tenants. Place it first with `placeSmokeTenant`.
   * @param tenantId Smoke tenant.
   * @param ownerUserId Owner of the smoke tenant, whose owner role holds every tenant permission.
   */
  async seedSmokeTenant(tenantId: string, ownerUserId: string): Promise<void> {
    await this.seed(
      tenantId,
      `${SeedRegionTenants.SMOKE_SLUG}-${this.settings.values.IDENTITY_REGION}`,
      TenantKind.Organization,
      true,
      ownerUserId,
    );
  }

  private async seed(
    tenantId: string,
    slug: string,
    kind: TenantKind,
    sharedGroup: boolean,
    ownerUserId?: string,
  ): Promise<void> {
    const region = this.settings.values.IDENTITY_REGION;
    if ((await this.reader.find(tenantId)) === undefined) {
      await this.provision.execute({
        tenantId,
        slug,
        name: slug,
        region,
        kind,
        ...(ownerUserId === undefined ? {} : { ownerUserId }),
      });
    }
    await this.status.activate(tenantId);
    const placed = await this.placement.place(tenantId, region, sharedGroup);
    await this.followers.place(this.entries.of(tenantId, placed));
  }
}
