import { Injectable } from '@nestjs/common';
import { PlanFeature, TenantKind } from '@contracts/identity';
import { EntitlementsProvider } from '../domain/entitlements-provider.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';

/**
 * Las funcionalidades del plan que billing informó para el tenant. Un tenant sin cuenta de facturación (los
 * que siembra la región, o uno que existía antes que billing) recibe las fijas de su tipo.
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
