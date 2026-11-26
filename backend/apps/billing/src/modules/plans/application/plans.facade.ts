import type { Plan } from '../domain/plan.js';

/** Lists the plans on offer and resolves a plan by id or code for subscriptions and invoices. */
export abstract class PlansFacade {
  abstract available(): Promise<readonly Plan[]>;
  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` if the plan does not exist in the catalog. */
  abstract require(planId: string): Promise<Plan>;
  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` if no plan has that code. */
  abstract requireCode(code: string): Promise<Plan>;
}
