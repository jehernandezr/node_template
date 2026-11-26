import {
  ConfigLoader,
  ConfigRegistry,
  RegistryAppConfig,
} from '@platform/config';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
} from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { BillingSettings } from '../../../../config/billing-settings.js';
import { BillingPeriod } from '../../domain/billing-period.js';
import { Subscription } from '../../domain/subscription.js';
import { ChangePlan } from '../../application/change-plan.use-case.js';
import { OpenSubscription } from '../../application/open-subscription.use-case.js';
import { SubscriptionEvents } from '../../application/subscription-events.js';
import { SubscriptionStanding } from '../../application/subscription-standing.js';
import { CatalogPlans } from './catalog-plans.js';
import { FixedUsage } from './fixed-usage.js';
import { InMemorySubscriptions } from './in-memory-subscriptions.js';

/** The subscription use cases of one tenant over doubles: a fixed clock, a plan catalog and a recording bus. */
export class SubscriptionsHarness {
  static readonly TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TRIAL_DAYS = 14;
  static readonly GRACE_DAYS = 7;

  readonly clock = new FixedClock(new Date('2026-11-01T09:00:00.000Z'));
  readonly subscriptions = new InMemorySubscriptions();
  readonly plans = new CatalogPlans();
  readonly usage = new FixedUsage();
  readonly transactions = new InMemoryTransactionManager();
  readonly bus = new RecordingMessageBus(this.transactions);
  private readonly events = new SubscriptionEvents(this.bus, this.clock);
  private readonly shard = UnroutedShardScopes.create();
  private readonly settings: BillingSettings;

  constructor() {
    const registry = new ConfigRegistry();
    registry.setRoot({
      BILLING_TRIAL_DAYS: SubscriptionsHarness.TRIAL_DAYS,
      BILLING_GRACE_DAYS: SubscriptionsHarness.GRACE_DAYS,
      BILLING_TRIAL_PLAN: CatalogPlans.TRIAL.code,
    });
    this.settings = new BillingSettings(
      new RegistryAppConfig(new ConfigLoader({}), registry),
    );
  }

  /** The use case that opens the trial subscription. */
  open(): OpenSubscription {
    return new OpenSubscription(
      this.subscriptions,
      this.plans,
      this.events,
      this.shard,
      this.transactions,
      new SequentialIdGenerator(),
      this.clock,
      this.settings,
    );
  }

  /** The use case that changes the plan. */
  changePlan(): ChangePlan {
    return new ChangePlan(
      this.subscriptions,
      this.plans,
      this.usage,
      this.events,
      this.shard,
      this.transactions,
      this.clock,
    );
  }

  /** The use case that moves the subscription through past due, suspended and active. */
  standing(): SubscriptionStanding {
    return new SubscriptionStanding(
      this.subscriptions,
      this.plans,
      this.events,
      this.shard,
      this.transactions,
      this.clock,
      this.settings,
    );
  }

  /** Stores a subscription to `plan` that is already active with its first period starting today. */
  async seedActive(plan = CatalogPlans.BASIC): Promise<void> {
    await this.subscriptions.insert(
      Subscription.open({
        id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
        plan,
        today: BillingPeriod.dateOf(this.clock.now()),
        trialDays: 0,
      }),
    );
  }
}
