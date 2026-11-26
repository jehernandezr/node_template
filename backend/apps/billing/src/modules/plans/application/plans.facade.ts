import type { Plan } from '../domain/plan.js';

/** Lists the plans on offer and resolves a plan by id or code for subscriptions and invoices. */
export abstract class PlansFacade {
  /**
   * Lists the plans on offer.
   * @returns The available plans.
   */
  abstract available(): Promise<readonly Plan[]>;
  /**
   * Reads a plan by id.
   * @param planId Plan to read.
   * @returns The plan.
   * @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` if the plan does not exist in the catalog.
   */
  abstract require(planId: string): Promise<Plan>;
  /**
   * Reads a plan by its code.
   * @param code Code of the plan, such as the trial plan.
   * @returns The plan.
   * @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` if no plan has that code.
   */
  abstract requireCode(code: string): Promise<Plan>;
}
