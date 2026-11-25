import { Injectable } from '@nestjs/common';
import { PlanFeature, TenantKind } from '@contracts/identity';
import { EntitlementsProvider } from '../domain/entitlements-provider.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';

/**
 * The plan features billing reported for the tenant. A tenant without a billing account (those
 * the region seeds, or one that existed before billing) receives the fixed ones of its type.
 */
@Injectable()
export class PlanEntitlementsProvider extends EntitlementsProvider {
  private static readonly BY_KIND: Readonly<
    Record<TenantKind, readonly PlanFeature[]>
  > = {
    [TenantKind.Organization]: [PlanFeature.Webhooks, PlanFeature.Billing],
    [TenantKind.SharedCustomers]: [],
    [TenantKind.Platform]: Object.values(PlanFeature),
  };

  features(tenant: TenantSnapshot): readonly PlanFeature[] {
    return tenant.planFeatures ?? PlanEntitlementsProvider.BY_KIND[tenant.kind];
  }
}
