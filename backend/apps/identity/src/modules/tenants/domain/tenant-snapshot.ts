import type {
  PlanFeature,
  TenantKind,
  TenantLifecycle,
} from '@contracts/identity';

/** Read-only view of a tenant. */
export interface TenantSnapshot {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly kind: TenantKind;
  readonly status: TenantLifecycle;
  readonly pinnedApiVersion?: string;
  readonly planFeatures?: readonly PlanFeature[];
}
