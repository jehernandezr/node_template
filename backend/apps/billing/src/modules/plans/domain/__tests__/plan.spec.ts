import { Currency, PlanPeriodicity, UsageMetric } from '@contracts/billing';
import { Plan, type PlanState } from '../plan.js';

const plan = (state: Partial<PlanState> = {}): Plan =>
  Plan.of({
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c01',
    code: 'pro',
    name: 'Pro',
    priceMinor: 189_000,
    currency: Currency.Cop,
    periodicity: PlanPeriodicity.Monthly,
    quotas: [{ metric: UsageMetric.Users, limit: 25 }],
    features: [],
    ...state,
  });

describe('Plan', () => {
  it('knows the limit of the metrics it limits and none of the others', () => {
    expect(plan().limitOf(UsageMetric.Users)).toBe(25);
    expect(plan().limitOf(UsageMetric.StorageGb)).toBeUndefined();
  });
});
