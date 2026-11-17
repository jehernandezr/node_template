import type { PlanFeature, TenantKind } from '@contracts/identity';

/** Funcionalidades del plan de un tenant. Hasta que llegue `billing` salen del tipo de tenant. */
export abstract class EntitlementsProvider {
  abstract features(kind: TenantKind): readonly PlanFeature[];
}
