import { ActingMember } from '@platform/auth';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import {
  ChangePlanRoute,
  GetSubscriptionRoute,
  type ChangePlanRequest,
  type Subscription,
} from '@contracts/billing';
import { BillingResource } from '../../../shared/enums/billing-resource.enum.js';
import { ChangePlan } from '../application/change-plan.use-case.js';
import { SubscriptionViews } from '../application/subscription-views.js';
import { SubscriptionsFacade } from '../application/subscriptions.facade.js';

/** HTTP routes of the subscription of the actor's tenant. */
@Resource(BillingResource.Subscription)
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsFacade,
    private readonly changePlan: ChangePlan,
  ) {}

  /**
   * Reads the subscription of the actor's tenant.
   * @param actor Signed-in actor; its tenant is read.
   * @returns The subscription.
   */
  @Endpoint(GetSubscriptionRoute)
  async get(@CurrentActor() actor: Actor | undefined): Promise<Subscription> {
    return SubscriptionViews.of(
      await this.subscriptions.current(ActingMember.of(actor).tenantId),
    );
  }

  /**
   * Changes the plan of the actor's tenant.
   * @param input Plan to move to.
   * @param actor Signed-in actor; its tenant changes plan.
   * @returns The subscription after the change.
   */
  @Endpoint(ChangePlanRoute)
  async change(
    @Input() input: ChangePlanRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Subscription> {
    return SubscriptionViews.of(
      await this.changePlan.execute(
        ActingMember.of(actor).tenantId,
        input.planId,
      ),
    );
  }
}
