import { BillingErrorCode, SubscriptionStatus } from '@contracts/billing';
import type { Currency, PlanPeriodicity } from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { BillingPeriod } from './billing-period.js';
import { ProrationCalculator } from './proration-calculator.js';

/** Lo que la suscripción necesita de un plan: su precio por periodo y cómo se cobra. */
export interface SubscribedPlan {
  readonly id: string;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly periodicity: PlanPeriodicity;
}

/** Estado completo de la suscripción de un tenant, tal como se guarda. */
export interface SubscriptionState {
  readonly id: string;
  readonly planId: string;
  /** El plan vigente al abrir el periodo: fija el cargo de su factura; los cambios posteriores van en el ajuste. */
  readonly periodPlanId: string;
  readonly status: SubscriptionStatus;
  readonly period: BillingPeriod;
  /** Ajustes de cambios de plan del periodo, que se cobran o acreditan en su factura. */
  readonly prorationMinor: number;
  readonly pastDueSince?: Date;
  readonly version?: number;
}

/** El periodo que se cerró, el plan de su cargo fijo y el ajuste de los cambios de plan. */
export interface ClosedPeriod {
  readonly period: BillingPeriod;
  readonly planId: string;
  readonly prorationMinor: number;
}

/**
 * La suscripción de un tenant: prueba, activa, morosa o suspendida. Cada transición devuelve `false` cuando
 * no cambia nada, para que repetirla no publique dos veces.
 */
export class Subscription {
  private static readonly CHANGEABLE: ReadonlySet<SubscriptionStatus> = new Set(
    [
      SubscriptionStatus.Trialing,
      SubscriptionStatus.Active,
      SubscriptionStatus.PastDue,
    ],
  );

  private constructor(private state: SubscriptionState) {}

  /** Abre la cuenta en prueba por `trialDays`; sin días de prueba, ya activa con su primer periodo, que se cobra al cerrar. */
  static open(input: {
    readonly id: string;
    readonly plan: SubscribedPlan;
    readonly today: string;
    readonly trialDays: number;
  }): Subscription {
    const trial = input.trialDays > 0;
    return new Subscription({
      id: input.id,
      planId: input.plan.id,
      periodPlanId: input.plan.id,
      status: trial ? SubscriptionStatus.Trialing : SubscriptionStatus.Active,
      period: trial
        ? BillingPeriod.ofDays(input.today, input.trialDays)
        : BillingPeriod.starting(input.today, input.plan.periodicity),
      prorationMinor: 0,
    });
  }

  static rehydrate(state: SubscriptionState): Subscription {
    return new Subscription(state);
  }

  snapshot(): SubscriptionState {
    return this.state;
  }

  /** Suspendida o cancelada: sin funcionalidades del plan. */
  isBlocked(): boolean {
    return !Subscription.CHANGEABLE.has(this.state.status);
  }

  /**
   * Cambia de plan. En prueba no hay nada que prorratear. Con un plan de la misma moneda y periodicidad se
   * acumula el ajuste del resto del periodo. Con otra, el periodo en curso termina ayer con un crédito por los
   * días que quedaban, así su factura cobra en su moneda solo lo usado, y el siguiente empieza hoy con el plan
   * nuevo; si el periodo empezó hoy, no se usó nada y vuelve a empezar con el plan nuevo. Un periodo que ya
   * terminó y espera su cierre no se ajusta: el plan nuevo rige desde el periodo siguiente.
   * @throws BillingError `BILLING.SUBSCRIPTION.NOT_CHANGEABLE` si está suspendida o cancelada.
   */
  changePlan(from: SubscribedPlan, to: SubscribedPlan, today: string): boolean {
    if (this.isBlocked()) {
      throw new BillingError(BillingErrorCode.SubscriptionNotChangeable);
    }
    if (this.state.planId === to.id) {
      return false;
    }
    const period = this.state.period;
    if (this.state.status === SubscriptionStatus.Trialing) {
      this.state = { ...this.state, planId: to.id, periodPlanId: to.id };
    } else if (period.start === today) {
      this.state = {
        ...this.state,
        planId: to.id,
        periodPlanId: to.id,
        period: BillingPeriod.starting(today, to.periodicity),
        prorationMinor: 0,
      };
    } else if (period.hasEndedBy(today)) {
      this.state = { ...this.state, planId: to.id };
    } else if (
      from.currency === to.currency &&
      from.periodicity === to.periodicity
    ) {
      this.state = {
        ...this.state,
        planId: to.id,
        prorationMinor:
          this.state.prorationMinor +
          ProrationCalculator.adjustment(
            from.priceMinor,
            to.priceMinor,
            period,
            today,
          ),
      };
    } else {
      this.state = {
        ...this.state,
        planId: to.id,
        period: period.endingBefore(today),
        prorationMinor:
          this.state.prorationMinor +
          ProrationCalculator.adjustment(from.priceMinor, 0, period, today),
      };
    }
    return true;
  }

  isDueForClosing(today: string): boolean {
    return !this.isBlocked() && this.state.period.hasEndedBy(today);
  }

  /**
   * Pasa al periodo siguiente. La prueba que termina activa la suscripción sin factura (`undefined`); un
   * periodo pagado devuelve lo que su factura cobra.
   */
  closePeriod(plan: SubscribedPlan): ClosedPeriod | undefined {
    const closing = this.state;
    this.state = {
      ...closing,
      status:
        closing.status === SubscriptionStatus.Trialing
          ? SubscriptionStatus.Active
          : closing.status,
      periodPlanId: closing.planId,
      period: closing.period.next(plan.periodicity),
      prorationMinor: 0,
    };
    return closing.status === SubscriptionStatus.Trialing
      ? undefined
      : {
          period: closing.period,
          planId: closing.periodPlanId,
          prorationMinor: closing.prorationMinor,
        };
  }

  markPastDue(now: Date): boolean {
    if (this.state.status !== SubscriptionStatus.Active) {
      return false;
    }
    this.state = {
      ...this.state,
      status: SubscriptionStatus.PastDue,
      pastDueSince: now,
    };
    return true;
  }

  /** Suspende una morosa cuya gracia terminó en `now`. */
  suspendIfOverdue(now: Date, graceDays: number): boolean {
    const since = this.state.pastDueSince;
    if (
      this.state.status !== SubscriptionStatus.PastDue ||
      since === undefined ||
      now.getTime() - since.getTime() < graceDays * 86_400_000
    ) {
      return false;
    }
    this.state = { ...this.state, status: SubscriptionStatus.Suspended };
    return true;
  }

  /**
   * Vuelve a activa tras un pago. Devuelve el estado del que salió, o `undefined` si ya estaba al día. Una morosa
   * conserva su periodo, porque siguió usando el plan. Una suspendida empieza hoy un periodo nuevo con el plan
   * vigente: los meses de suspensión no se usaron y no se cobran, y el periodo que la suspensión dejó abierto tampoco.
   */
  settle(plan: SubscribedPlan, today: string): SubscriptionStatus | undefined {
    const previous = this.state.status;
    if (
      previous !== SubscriptionStatus.PastDue &&
      previous !== SubscriptionStatus.Suspended
    ) {
      return undefined;
    }
    const restarts = previous === SubscriptionStatus.Suspended;
    this.state = {
      id: this.state.id,
      planId: this.state.planId,
      periodPlanId: restarts ? this.state.planId : this.state.periodPlanId,
      status: SubscriptionStatus.Active,
      period: restarts
        ? BillingPeriod.starting(today, plan.periodicity)
        : this.state.period,
      prorationMinor: restarts ? 0 : this.state.prorationMinor,
      ...(this.state.version === undefined
        ? {}
        : { version: this.state.version }),
    };
    return previous;
  }
}
