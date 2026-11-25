import type { Plan, PlanState } from './plan.js';

/** Plan catalog, shared by all tenants. */
export abstract class PlanCatalog {
  abstract available(): Promise<readonly Plan[]>;
  abstract find(planId: string): Promise<Plan | undefined>;
  abstract findByCode(code: string): Promise<Plan | undefined>;
  /** Creates the plan or replaces the one with the same `code`, with its quotas. Returns the stored plan. */
  abstract save(plan: Omit<PlanState, 'id'>, newId: string): Promise<Plan>;
}
