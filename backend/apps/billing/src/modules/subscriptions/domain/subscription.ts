import { BillingErrorCode, SubscriptionStatus } from '@contracts/billing';
import type { Currency, PlanPeriodicity } from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { BillingPeriod } from './billing-period.js';
import { ProrationCalculator } from './proration-calculator.js';

/** What the subscription needs from a plan: its price per period and how it is charged. */
export interface SubscribedPlan {
  readonly id: string;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly periodicity: PlanPeriodicity;
}

/** Full state of a tenant's subscription, as stored. */
export interface SubscriptionState {
  readonly id: string;
  readonly planId: string;
  /** The current plan when the period opened: sets its invoice charge; later changes go into the adjustment. */
  readonly periodPlanId: string;
  readonly status: SubscriptionStatus;
  readonly period: BillingPeriod;
  /** Plan change adjustments of the period, charged or credited on its invoice. */
  readonly prorationMinor: number;
  readonly pastDueSince?: Date;
  readonly version?: number;
}

/** The period that was closed, the plan of its fixed charge and the plan change adjustment. */
export interface ClosedPeriod {
  readonly period: BillingPeriod;
  readonly planId: string;
  readonly prorationMinor: number;
}

/**
 * A tenant's subscription: trialing, active, past due or suspended. Each transition returns `false` when
 * nothing changes, so that repeating it does not publish twice.
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

  /**
   * Opens the account on trial for `trialDays`; without trial days, already active with its first period, charged at closing.
   * @param input Id, plan, opening date and trial days.
   * @returns The new subscription.
   */
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

  /**
   * Rebuilds a subscription from its state.
   * @param state Stored subscription.
   * @returns The subscription.
   */
  static rehydrate(state: SubscriptionState): Subscription {
    return new Subscription(state);
  }

  /**
   * Copies the subscription state to store or show it.
   * @returns The subscription state.
   */
  snapshot(): SubscriptionState {
    return this.state;
  }

  /**
   * Suspended or canceled: no plan features.
   * @returns `true` while suspended or canceled.
   */
  isBlocked(): boolean {
    return !Subscription.CHANGEABLE.has(this.state.status);
  }

  /**
   * Changes the plan. On trial there is nothing to prorate. With a plan of the same currency and billing interval the
   * adjustment for the rest of the period accumulates. With a different one, the current period ends yesterday with a credit for the
   * remaining days, so its invoice charges only what was used in its currency, and the next one starts today with the new
   * plan; if the period started today, nothing was used and it starts again with the new plan. A period that already
   * ended and awaits its closing is not adjusted: the new plan applies from the next period.
   * @param from Plan left.
   * @param to Plan moved to.
   * @param today Day of the change.
   * @returns `true` when the plan changed.
   * @throws BillingError `BILLING.SUBSCRIPTION.NOT_CHANGEABLE` if it is suspended or canceled.
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

  /**
   * Tells whether the period ended before `today` and the subscription is neither suspended nor canceled.
   * @param today Date to compare.
   * @returns `true` when it must be closed.
   */
  isDueForClosing(today: string): boolean {
    return !this.isBlocked() && this.state.period.hasEndedBy(today);
  }

  /**
   * Moves to the next period. An ending trial activates the subscription without an invoice (`undefined`); a
   * paid period returns what its invoice charges.
   * @param plan Current plan.
   * @returns What the invoice charges, or `undefined` for a trial.
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

  /**
   * Marks an active subscription past due after a failed charge.
   * @param now Instant of the failure.
   * @returns `true` when the status changed.
   */
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

  /**
   * Suspends a past-due subscription whose grace period ended at `now`.
   * @param now Current instant.
   * @param graceDays Days of grace after becoming past due.
   * @returns `true` when it was suspended.
   */
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
   * Returns to active after a payment. Returns the state it left, or `undefined` if it was already current. A past-due
   * subscription keeps its period, because it kept using the plan. A suspended one starts a new period today with the current
   * plan: the months of suspension were not used and are not charged, and neither is the period the suspension left open.
   * @param plan Current plan.
   * @param today Day of the payment.
   * @returns The status it left, or `undefined`.
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
