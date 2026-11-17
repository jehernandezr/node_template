import { Injectable } from '@nestjs/common';
import { TenantKind } from '@contracts/identity';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { ChangeTenantStatus } from './change-tenant-status.use-case.js';
import { ProvisionTenant } from './provision-tenant.use-case.js';
import { TenantReader } from './tenant-reader.js';

/**
 * Siembra los dos tenants fijos de la región: el de plataforma y el compartido de clientes, donde quedan
 * quienes se registran sin invitación. Es idempotente: se corre en cada despliegue.
 */
@Injectable()
export class SeedRegionTenants {
  private static readonly SHARED_SLUG = 'customers';
  private static readonly PLATFORM_SLUG = 'platform';

  constructor(
    private readonly provision: ProvisionTenant,
    private readonly status: ChangeTenantStatus,
    private readonly reader: TenantReader,
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
  }
}
