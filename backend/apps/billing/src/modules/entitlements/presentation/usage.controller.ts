import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Resource } from '@platform/http/nest';
import { GetUsageRoute, type UsageOverview } from '@contracts/billing';
import { BillingResource } from '../../../shared/enums/billing-resource.enum.js';
import { ActingTenant } from '../../../shared/utils/acting-tenant.js';
import { EntitlementQueries } from '../application/entitlement-queries.js';

@Resource(BillingResource.Usage)
export class UsageController {
  constructor(private readonly queries: EntitlementQueries) {}

  @Endpoint(GetUsageRoute)
  get(@CurrentActor() actor: Actor | undefined): Promise<UsageOverview> {
    return this.queries.overview(ActingTenant.of(actor));
  }
}
