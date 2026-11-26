import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryPlanCatalog } from '../../__tests__/utils/index.js';
import { SEED_PLANS } from '../seed-plans.constants.js';
import { SeedPlans } from '../seed-plans.use-case.js';

describe('SeedPlans', () => {
  it('stores every configured plan in the catalog', async () => {
    const catalog = new InMemoryPlanCatalog();

    const saved = await new SeedPlans(
      catalog,
      new SequentialIdGenerator(),
    ).execute();

    expect(saved.map((plan) => plan.snapshot().code)).toEqual(
      SEED_PLANS.map((plan) => plan.code),
    );
    await expect(catalog.available()).resolves.toHaveLength(SEED_PLANS.length);
  });

  it('keeps the id of each plan when a deployment seeds again, so no plan is duplicated', async () => {
    const catalog = new InMemoryPlanCatalog();
    const ids = new SequentialIdGenerator();
    const first = await new SeedPlans(catalog, ids).execute();

    const second = await new SeedPlans(catalog, ids).execute();

    expect(second.map((plan) => plan.id)).toEqual(first.map((plan) => plan.id));
    await expect(catalog.available()).resolves.toHaveLength(SEED_PLANS.length);
  });

  it('restores the configured prices of plans that were edited in the catalog', async () => {
    const catalog = new InMemoryPlanCatalog();
    const ids = new SequentialIdGenerator();
    for (const plan of SEED_PLANS) {
      await catalog.save({ ...plan, priceMinor: 1 }, ids.next().toString());
    }

    await new SeedPlans(catalog, ids).execute();

    const stored = await catalog.available();
    expect(stored.map((plan) => plan.snapshot().priceMinor)).toEqual(
      SEED_PLANS.map((plan) => plan.priceMinor),
    );
  });
});
