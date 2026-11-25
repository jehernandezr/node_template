import {
  BillingErrorCode,
  Currency,
  PlanPeriodicity,
  SubscriptionStatus,
} from '@contracts/billing';
import { BillingPeriod } from '../billing-period.js';
import { Subscription, type SubscribedPlan } from '../subscription.js';

const START = {
  id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c10',
  priceMinor: 49_900,
  currency: Currency.Cop,
  periodicity: PlanPeriodicity.Monthly,
};
const PRO: SubscribedPlan = {
  ...START,
  id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c11',
  priceMinor: 189_000,
};
const ENTERPRISE: SubscribedPlan = {
  id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c12',
  priceMinor: 110_000,
  currency: Currency.Usd,
  periodicity: PlanPeriodicity.Annual,
};

const active = (status = SubscriptionStatus.Active) =>
  Subscription.rehydrate({
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c20',
    planId: START.id,
    periodPlanId: START.id,
    status,
    period: BillingPeriod.of('2026-11-01', '2026-11-30'),
    prorationMinor: 0,
    ...(status === SubscriptionStatus.PastDue
      ? { pastDueSince: new Date('2026-11-10T00:00:00.000Z') }
      : {}),
  });

describe('Subscription', () => {
  describe('when a tenant opens its account', () => {
    it('starts a trial of the given days', () => {
      const subscription = Subscription.open({
        id: 's-1',
        plan: START,
        today: '2026-11-20',
        trialDays: 14,
      });

      expect(subscription.snapshot()).toMatchObject({
        status: SubscriptionStatus.Trialing,
        period: { start: '2026-11-20', end: '2026-12-03' },
      });
    });

    it('starts active with a full period when there is no trial', () => {
      const subscription = Subscription.open({
        id: 's-1',
        plan: START,
        today: '2026-11-20',
        trialDays: 0,
      });

      expect(subscription.snapshot()).toMatchObject({
        status: SubscriptionStatus.Active,
        period: { start: '2026-11-20', end: '2026-12-19' },
      });
    });
  });

  describe('when it changes plan', () => {
    it('accumulates the proration of an upgrade in the middle of the period', () => {
      const subscription = active();

      subscription.changePlan(START, PRO, '2026-11-21');

      expect(subscription.snapshot()).toMatchObject({
        planId: PRO.id,
        prorationMinor: 46_367,
      });
    });

    it('ends the period yesterday with a credit for the days left when the plan is charged in another currency or periodicity', () => {
      const subscription = active();
      subscription.changePlan(START, PRO, '2026-11-11');

      subscription.changePlan(PRO, ENTERPRISE, '2026-11-21');

      expect(subscription.snapshot()).toMatchObject({
        planId: ENTERPRISE.id,
        periodPlanId: START.id,
        period: { start: '2026-11-01', end: '2026-11-20' },
        prorationMinor: 92_734 - 63_000,
      });
      expect(subscription.isDueForClosing('2026-11-21')).toBe(true);
    });

    it('starts over on the new plan when the period began today', () => {
      const subscription = active();

      subscription.changePlan(START, ENTERPRISE, '2026-11-01');

      expect(subscription.snapshot()).toMatchObject({
        planId: ENTERPRISE.id,
        periodPlanId: ENTERPRISE.id,
        prorationMinor: 0,
        period: { start: '2026-11-01', end: '2027-10-31' },
      });
    });

    it('leaves a period that already ended as it was and applies the plan from the next one', () => {
      const subscription = active();

      subscription.changePlan(START, ENTERPRISE, '2026-12-01');

      expect(subscription.snapshot()).toMatchObject({
        planId: ENTERPRISE.id,
        periodPlanId: START.id,
        prorationMinor: 0,
        period: { start: '2026-11-01', end: '2026-11-30' },
      });
    });

    it('never credits more than the fee of the period, so its invoice is never in favor of the tenant', () => {
      const subscription = Subscription.rehydrate({
        id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c21',
        planId: PRO.id,
        periodPlanId: PRO.id,
        status: SubscriptionStatus.Active,
        period: BillingPeriod.of('2026-11-01', '2026-11-30'),
        prorationMinor: 0,
      });
      subscription.changePlan(PRO, START, '2026-11-02');
      subscription.changePlan(START, ENTERPRISE, '2026-11-03');

      const closed = subscription.closePeriod(ENTERPRISE);

      expect(PRO.priceMinor + (closed?.prorationMinor ?? 0)).toBe(7_964);
    });

    it('prorates nothing during the trial', () => {
      const subscription = Subscription.open({
        id: 's-1',
        plan: START,
        today: '2026-11-20',
        trialDays: 14,
      });

      subscription.changePlan(START, PRO, '2026-11-21');

      expect(subscription.snapshot().prorationMinor).toBe(0);
    });

    it('changes nothing when the plan is the current one', () => {
      expect(active().changePlan(START, START, '2026-11-21')).toBe(false);
    });

    it('refuses while suspended', () => {
      expect(() =>
        active(SubscriptionStatus.Suspended).changePlan(
          START,
          PRO,
          '2026-11-21',
        ),
      ).toThrow(
        expect.objectContaining({
          code: BillingErrorCode.SubscriptionNotChangeable,
        }),
      );
    });
  });

  describe('when its period ends', () => {
    it('charges the closed period with the plan it started with plus the proration, and starts the next one on the new plan', () => {
      const subscription = active();
      subscription.changePlan(START, PRO, '2026-11-21');

      const closed = subscription.closePeriod(PRO);

      expect(closed).toEqual({
        period: BillingPeriod.of('2026-11-01', '2026-11-30'),
        planId: START.id,
        prorationMinor: 46_367,
      });
      expect(subscription.snapshot()).toMatchObject({
        planId: PRO.id,
        periodPlanId: PRO.id,
        period: { start: '2026-12-01', end: '2026-12-31' },
        prorationMinor: 0,
      });
    });

    it('charges the next period with the plan of the previous change', () => {
      const subscription = active();
      subscription.changePlan(START, PRO, '2026-11-21');
      subscription.closePeriod(PRO);

      expect(subscription.closePeriod(PRO)).toMatchObject({
        planId: PRO.id,
        prorationMinor: 0,
      });
    });

    it('charges the days used of a period cut by a change of currency and starts the next one on the day of the change', () => {
      const subscription = active();
      subscription.changePlan(START, ENTERPRISE, '2026-11-21');

      const closed = subscription.closePeriod(ENTERPRISE);

      expect(closed).toEqual({
        period: BillingPeriod.of('2026-11-01', '2026-11-20'),
        planId: START.id,
        prorationMinor: -16_633,
      });
      expect(subscription.snapshot()).toMatchObject({
        periodPlanId: ENTERPRISE.id,
        period: { start: '2026-11-21', end: '2027-11-20' },
        prorationMinor: 0,
      });
    });

    it('activates a trial that ended without an invoice', () => {
      const subscription = Subscription.open({
        id: 's-1',
        plan: START,
        today: '2026-11-20',
        trialDays: 14,
      });

      expect(subscription.closePeriod(START)).toBeUndefined();
      expect(subscription.snapshot()).toMatchObject({
        status: SubscriptionStatus.Active,
        period: { start: '2026-12-04' },
      });
    });

    it('is due once its period ended and it is not suspended', () => {
      expect(active().isDueForClosing('2026-12-01')).toBe(true);
      expect(active().isDueForClosing('2026-11-30')).toBe(false);
      expect(
        active(SubscriptionStatus.Suspended).isDueForClosing('2026-12-01'),
      ).toBe(false);
    });
  });

  describe('dunning', () => {
    it('falls past due when a payment fails, once', () => {
      const subscription = active();

      expect(
        subscription.markPastDue(new Date('2026-12-01T00:00:00.000Z')),
      ).toBe(true);
      expect(
        subscription.markPastDue(new Date('2026-12-02T00:00:00.000Z')),
      ).toBe(false);
      expect(subscription.snapshot()).toMatchObject({
        status: SubscriptionStatus.PastDue,
        pastDueSince: new Date('2026-12-01T00:00:00.000Z'),
      });
    });

    it('is suspended only after the grace days', () => {
      const subscription = active(SubscriptionStatus.PastDue);

      expect(
        subscription.suspendIfOverdue(new Date('2026-11-16T23:59:59.000Z'), 7),
      ).toBe(false);
      expect(
        subscription.suspendIfOverdue(new Date('2026-11-17T00:00:00.000Z'), 7),
      ).toBe(true);
      expect(subscription.isBlocked()).toBe(true);
    });

    it('is active again after a payment and says where it came from', () => {
      const subscription = active(SubscriptionStatus.Suspended);

      expect(subscription.settle(START, '2026-12-03')).toBe(
        SubscriptionStatus.Suspended,
      );
      expect(subscription.snapshot().status).toBe(SubscriptionStatus.Active);
      expect(subscription.settle(START, '2026-12-03')).toBeUndefined();
    });

    it('starts a new period on the day it comes back from a suspension of months, so the months suspended are not due', () => {
      const subscription = active(SubscriptionStatus.Suspended);

      subscription.settle(START, '2027-05-15');

      expect(subscription.snapshot().period).toEqual(
        BillingPeriod.of('2027-05-15', '2027-06-14'),
      );
      expect(subscription.isDueForClosing('2027-05-16')).toBe(false);
      expect(subscription.isDueForClosing('2027-06-15')).toBe(true);
    });

    it('keeps the period of a past due subscription, which kept using the plan', () => {
      const subscription = active(SubscriptionStatus.PastDue);

      subscription.settle(START, '2026-11-20');

      expect(subscription.snapshot().period).toEqual(
        BillingPeriod.of('2026-11-01', '2026-11-30'),
      );
    });
  });
});
