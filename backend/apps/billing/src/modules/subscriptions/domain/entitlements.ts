import type { PlanFeature } from '@contracts/identity';
import type { QuotaLimit, SubscriptionStatus } from '@contracts/billing';

/** Funcionalidades y cuotas vigentes de un tenant: las del plan, sin funcionalidades si está bloqueado. */
export interface Entitlements {
  readonly status: SubscriptionStatus;
  readonly features: readonly PlanFeature[];
  readonly quotas: readonly QuotaLimit[];
}
