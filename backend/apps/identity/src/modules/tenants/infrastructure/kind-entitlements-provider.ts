import { Injectable } from '@nestjs/common';
import { PlanFeature, TenantKind } from '@contracts/identity';
import { EntitlementsProvider } from '../domain/entitlements-provider.js';

/** Funcionalidades fijas por tipo de tenant, mientras los planes no existen. */
@Injectable()
export class KindEntitlementsProvider extends EntitlementsProvider {
  private static readonly BY_KIND: Readonly<
    Record<TenantKind, readonly PlanFeature[]>
  > = {
    [TenantKind.Organization]: [PlanFeature.Webhooks, PlanFeature.Billing],
    [TenantKind.SharedCustomers]: [],
    [TenantKind.Platform]: Object.values(PlanFeature),
  };

  features(kind: TenantKind): readonly PlanFeature[] {
    return KindEntitlementsProvider.BY_KIND[kind];
  }
}
