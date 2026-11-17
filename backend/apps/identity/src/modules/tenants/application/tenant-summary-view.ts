import type { TenantSummary } from '@contracts/identity';
import type { TenantState } from '../domain/tenant.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';

/** La vista de un tenant que responden la fachada y el contrato. */
export class TenantSummaryView {
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
    };
  }

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
