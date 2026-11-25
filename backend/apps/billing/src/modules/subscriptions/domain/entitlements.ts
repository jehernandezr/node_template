import type { PlanFeature } from '@contracts/identity';
import type { QuotaLimit, SubscriptionStatus } from '@contracts/billing';

/** A tenant's current features and quotas: those of the plan, with no features if it is blocked. */
export interface Entitlements {
  readonly status: SubscriptionStatus;
  readonly features: readonly PlanFeature[];
  readonly quotas: readonly QuotaLimit[];
}
