import {
  TenantLifecycle,
  type PlanFeature,
  type TenantKind,
} from '@contracts/identity';

/** Estado completo de un tenant, tal como se guarda. */
export interface TenantState {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly kind: TenantKind;
  readonly status: TenantLifecycle;
  readonly pinnedApiVersion?: string;
  /** Funcionalidades del plan vigente según billing; sin valor, las del tipo de tenant. */
  readonly planFeatures?: readonly PlanFeature[];
  /** Cuándo decidió billing las funcionalidades guardadas: un cambio anterior que llega tarde no las pisa. */
  readonly planChangedAt?: Date;
  readonly version?: number;
}

/** Un tenant: la organización (o el espacio compartido) dueña de los datos de negocio. */
export class Tenant {
  private constructor(private state: TenantState) {}

  /** Tenant recién creado, en aprovisionamiento hasta que lo activen. */
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
   * Guarda las funcionalidades que billing decidió en `changedAt`. Devuelve `false` si ya tiene una decisión
   * posterior; repetir la misma decisión la aplica otra vez, para que quien la reintenta termine su efecto.
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

  /** Devuelve `false` si no estaba en aprovisionamiento. */
  activate(): boolean {
    return this.move(TenantLifecycle.Provisioning, TenantLifecycle.Active);
  }

  /** Devuelve `false` si no estaba activo: la operación es idempotente. */
  suspend(): boolean {
    return this.move(TenantLifecycle.Active, TenantLifecycle.Suspended);
  }

  /** Devuelve `false` si no estaba suspendido. */
  reactivate(): boolean {
    return this.move(TenantLifecycle.Suspended, TenantLifecycle.Active);
  }

  /** Solo un tenant en aprovisionamiento se puede descartar: no tiene datos de negocio. */
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
