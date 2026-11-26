import { Currency, PlanPeriodicity, UsageMetric } from '@contracts/billing';
import { BillingError } from '../../../../shared/errors/billing.error.js';
import { BillingErrorCode } from '@contracts/billing';
import { PlansFacade } from '../../../plans/index.js';
import { Plan, type PlanState } from '../../../plans/index.js';

/** A fixed plan catalog: a free trial, a basic plan with five users and a pro plan with fifty. */
export class CatalogPlans extends PlansFacade {
  static readonly TRIAL: PlanState = {
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c01',
    code: 'trial',
    name: 'Trial',
    priceMinor: 0,
    currency: Currency.Cop,
    periodicity: PlanPeriodicity.Monthly,
    quotas: [{ metric: UsageMetric.Users, limit: 5 }],
    features: [],
  };

  static readonly BASIC: PlanState = {
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c02',
    code: 'basic',
    name: 'Basic',
    priceMinor: 90_000,
    currency: Currency.Cop,
    periodicity: PlanPeriodicity.Monthly,
    quotas: [{ metric: UsageMetric.Users, limit: 5 }],
    features: [],
  };

  static readonly PRO: PlanState = {
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c03',
    code: 'pro',
    name: 'Pro',
    priceMinor: 300_000,
    currency: Currency.Cop,
    periodicity: PlanPeriodicity.Monthly,
    quotas: [{ metric: UsageMetric.Users, limit: 50 }],
    features: [],
  };

  private readonly plans = [
    CatalogPlans.TRIAL,
    CatalogPlans.BASIC,
    CatalogPlans.PRO,
  ].map((state) => Plan.of(state));

  override async available(): Promise<readonly Plan[]> {
    return this.plans;
  }

  override async require(planId: string): Promise<Plan> {
    return this.find((plan) => plan.id === planId);
  }

  override async requireCode(code: string): Promise<Plan> {
    return this.find((plan) => plan.snapshot().code === code);
  }

  private find(matches: (plan: Plan) => boolean): Plan {
    const plan = this.plans.find(matches);
    if (plan === undefined) {
      throw new BillingError(BillingErrorCode.PlanNotAvailable);
    }
    return plan;
  }
}
