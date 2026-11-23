import type { Plan } from '../domain/plan.js';

/** Lo que `plans` ofrece a los otros módulos. */
export abstract class PlansFacade {
  abstract available(): Promise<readonly Plan[]>;
  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` si el plan no existe en el catálogo. */
  abstract require(planId: string): Promise<Plan>;
  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` si ningún plan tiene ese código. */
  abstract requireCode(code: string): Promise<Plan>;
}
