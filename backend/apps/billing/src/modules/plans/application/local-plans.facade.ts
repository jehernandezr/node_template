import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { PlanCatalog } from '../domain/plan-catalog.js';
import type { Plan } from '../domain/plan.js';
import { PlansFacade } from './plans.facade.js';

/** In-process `PlansFacade`. */
@Injectable()
export class LocalPlansFacade extends PlansFacade {
  constructor(private readonly catalog: PlanCatalog) {
    super();
  }

  available(): Promise<readonly Plan[]> {
    return this.catalog.available();
  }

  async require(planId: string): Promise<Plan> {
    return LocalPlansFacade.found(await this.catalog.find(planId));
  }

  async requireCode(code: string): Promise<Plan> {
    return LocalPlansFacade.found(await this.catalog.findByCode(code));
  }

  private static found(plan: Plan | undefined): Plan {
    if (plan === undefined) {
      throw new BillingError(BillingErrorCode.PlanNotAvailable);
    }
    return plan;
  }
}
