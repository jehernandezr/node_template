import { Endpoint, Resource } from '@platform/http/nest';
import { ListPlansRoute, type PlanCatalog } from '@contracts/billing';
import { BillingResource } from '../../../shared/enums/billing-resource.enum.js';
import { PlansFacade } from '../application/plans.facade.js';
import { PlanViews } from '../application/plan-views.js';

/** HTTP routes of the plan catalog. */
@Resource(BillingResource.Plans)
export class PlansController {
  constructor(private readonly plans: PlansFacade) {}

  /**
   * Lists the plans a tenant can subscribe to.
   * @returns The catalog of plans.
   */
  @Endpoint(ListPlansRoute)
  async list(): Promise<PlanCatalog> {
    return {
      items: (await this.plans.available()).map((plan) => PlanViews.of(plan)),
    };
  }
}
