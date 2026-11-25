import {
  TenantLifecycle,
  type PlanFeature,
  type TenantKind,
} from '@contracts/identity';

/** Full state of a tenant, as it is stored. */
export interface TenantState {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly kind: TenantKind;
  readonly status: TenantLifecycle;
  readonly pinnedApiVersion?: string;
  /** Features of the current plan according to billing; when empty, those of the tenant type. */
  readonly planFeatures?: readonly PlanFeature[];
  /** When billing decided the stored features: an earlier change that arrives late does not overwrite them. */
  readonly planChangedAt?: Date;
  readonly version?: number;
}

/** A tenant: the organization (or the shared space) that owns the business data. */
export class Tenant {
  private constructor(private state: TenantState) {}

  /** Newly created tenant, in provisioning until it is activated. */
  static provision(state: Omit<TenantState, 'status' | 'version'>): Tenant {
    return new Tenant({ ...state, status: TenantLifecycle.Provisioning });
  }

  static rehydrate(state: TenantState): Tenant {
    return new Tenant(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): TenantState {
    return this.state;
  }

  /**
   * Saves the features billing decided at `changedAt`. Returns `false` if it already has a later
   * decision; repeating the same decision applies it again, so whoever retries it completes its effect.
   */
  applyPlan(features: readonly PlanFeature[], changedAt: Date): boolean {
    const current = this.state.planChangedAt;
    if (current !== undefined && changedAt.getTime() < current.getTime()) {
      return false;
    }
    this.state = {
      ...this.state,
      planFeatures: [...features],
      planChangedAt: changedAt,
    };
    return true;
  }

  isActive(): boolean {
    return this.state.status === TenantLifecycle.Active;
  }

  /** Returns `false` if it was not in provisioning. */
  activate(): boolean {
    return this.move(TenantLifecycle.Provisioning, TenantLifecycle.Active);
  }

  /** Returns `false` if it was not active: the operation is idempotent. */
  suspend(): boolean {
    return this.move(TenantLifecycle.Active, TenantLifecycle.Suspended);
  }

  /** Returns `false` if it was not suspended. */
  reactivate(): boolean {
    return this.move(TenantLifecycle.Suspended, TenantLifecycle.Active);
  }

  /** Only a tenant being provisioned can be discarded: it has no business data. */
  canBeDiscarded(): boolean {
    return this.state.status === TenantLifecycle.Provisioning;
  }

  rename(name: string): void {
    this.state = { ...this.state, name };
  }

  private move(from: TenantLifecycle, to: TenantLifecycle): boolean {
    if (this.state.status !== from) {
      return false;
    }
    this.state = { ...this.state, status: to };
    return true;
  }
}
