import { Endpoint, Resource } from '@platform/http/nest';
import { ListPlansRoute, type PlanCatalog } from '@contracts/billing';
import { BillingResource } from '../../../shared/enums/billing-resource.enum.js';
import { PlansFacade } from '../application/plans.facade.js';
import { PlanViews } from '../application/plan-views.js';

@Resource(BillingResource.Plans)
export class PlansController {
  constructor(private readonly plans: PlansFacade) {}

  @Endpoint(ListPlansRoute)
  async list(): Promise<PlanCatalog> {
    return {
      items: (await this.plans.available()).map((plan) => PlanViews.of(plan)),
    };
  }
}
