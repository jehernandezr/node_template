import type { Plan, PlanState } from './plan.js';

/** Plan catalog, shared by all tenants. */
export abstract class PlanCatalog {
  /**
   * Lists the plans on offer.
   * @returns The available plans.
   */
  abstract available(): Promise<readonly Plan[]>;
  /**
   * Reads a plan by id.
   * @param planId Plan to read.
   * @returns The plan, or `undefined` when it does not exist.
   */
  abstract find(planId: string): Promise<Plan | undefined>;
  /**
   * Reads a plan by its code.
   * @param code Code of the plan.
   * @returns The plan, or `undefined` when no plan has it.
   */
  abstract findByCode(code: string): Promise<Plan | undefined>;
  /**
   * Creates the plan or replaces the one with the same `code`, with its quotas. Returns the stored plan.
   * @param plan Plan without its id.
   * @param newId Id used when the plan is new.
   * @returns The stored plan.
   */
  abstract save(plan: Omit<PlanState, 'id'>, newId: string): Promise<Plan>;
}
