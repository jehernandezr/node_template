import { ActingMember } from '@platform/auth';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Resource } from '@platform/http/nest';
import { GetUsageRoute, type UsageOverview } from '@contracts/billing';
import { BillingResource } from '../../../shared/enums/billing-resource.enum.js';
import { EntitlementQueries } from '../application/entitlement-queries.js';

/** HTTP routes of the usage overview of the actor's tenant. */
@Resource(BillingResource.Usage)
export class UsageController {
  constructor(private readonly queries: EntitlementQueries) {}

  /**
   * Returns the usage of the current period of the actor's tenant.
   * @param actor Signed-in actor; its tenant is read.
   * @returns The usage of each metric with its limit.
   */
  @Endpoint(GetUsageRoute)
  get(@CurrentActor() actor: Actor | undefined): Promise<UsageOverview> {
    return this.queries.overview(ActingMember.of(actor).tenantId);
  }
}
