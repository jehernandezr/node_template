import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { PlanCatalog } from '../domain/plan-catalog.js';
import type { Plan } from '../domain/plan.js';
import { PlansFacade } from './plans.facade.js';

/** Answers the plans on offer and resolves a plan by id or code from the catalog, for subscriptions and invoices. */
@Injectable()
export class LocalPlansFacade extends PlansFacade {
  constructor(private readonly catalog: PlanCatalog) {
    super();
  }

  override available(): Promise<readonly Plan[]> {
    return this.catalog.available();
  }

  override async require(planId: string): Promise<Plan> {
    return LocalPlansFacade.found(await this.catalog.find(planId));
  }

  override async requireCode(code: string): Promise<Plan> {
    return LocalPlansFacade.found(await this.catalog.findByCode(code));
  }

  private static found(plan: Plan | undefined): Plan {
    if (plan === undefined) {
      throw new BillingError(BillingErrorCode.PlanNotAvailable);
    }
    return plan;
  }
}
