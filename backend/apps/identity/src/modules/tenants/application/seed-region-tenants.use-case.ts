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
 * Siembra los dos tenants fijos de la región: el de plataforma y el compartido de clientes, donde quedan
 * quienes se registran sin invitación. No pasan por la saga de alta, así que aquí mismo se anotan en el directorio
 * de los demás servicios: corre después de desplegarlos. Es idempotente: se corre en cada despliegue.
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
