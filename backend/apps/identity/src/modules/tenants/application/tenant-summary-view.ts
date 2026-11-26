import type { TenantSummary } from '@contracts/identity';
import type { TenantState } from '../domain/tenant.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';

/** The view of a tenant that the facade and the contract return. */
export class TenantSummaryView {
  /**
   * Builds the snapshot other modules read from a tenant state.
   * @param state Stored tenant.
   * @returns The snapshot.
   */
  static snapshot(state: TenantState): TenantSnapshot {
    return {
      id: state.id,
      slug: state.slug,
      name: state.name,
      region: state.region,
      kind: state.kind,
      status: state.status,
      ...(state.pinnedApiVersion === undefined
        ? {}
        : { pinnedApiVersion: state.pinnedApiVersion }),
      ...(state.planFeatures === undefined
        ? {}
        : { planFeatures: state.planFeatures }),
    };
  }

  /**
   * Builds the API view of a tenant.
   * @param state Tenant snapshot.
   * @returns Its summary.
   */
  static summary(state: TenantSnapshot): TenantSummary {
    return {
      id: state.id,
      slug: state.slug,
      name: state.name,
      region: state.region,
      kind: state.kind,
      status: state.status,
    };
  }
}
