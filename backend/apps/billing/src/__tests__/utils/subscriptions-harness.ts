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
import { BillingSettings } from '../../config/billing-settings.js';
import { BillingPeriod } from '../../modules/subscriptions/domain/billing-period.js';
import { Subscription } from '../../modules/subscriptions/domain/subscription.js';
import { ChangePlan } from '../../modules/subscriptions/application/change-plan.use-case.js';
import { CloseSubscriptionPeriod } from '../../modules/subscriptions/application/close-subscription-period.use-case.js';
import { LocalSubscriptionsFacade } from '../../modules/subscriptions/application/local-subscriptions.facade.js';
import { OpenSubscription } from '../../modules/subscriptions/application/open-subscription.use-case.js';
import { SubscriptionEvents } from '../../modules/subscriptions/application/subscription-events.js';
import { SubscriptionStanding } from '../../modules/subscriptions/application/subscription-standing.js';
import { CatalogPlans } from './catalog-plans.js';
import { FixedUsage } from './fixed-usage.js';
import { InMemorySubscriptions } from './in-memory-subscriptions.js';
import { SingleTenantMaintenance } from './single-tenant-maintenance.js';

/** The subscription use cases of one tenant over doubles: a fixed clock, a plan catalog and a recording bus. */
export class SubscriptionsHarness {
  static readonly TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TRIAL_DAYS = 14;
  static readonly GRACE_DAYS = 7;
  static readonly INVOICE_SERIES = 'FAC';

  readonly clock = new FixedClock(new Date('2026-11-01T09:00:00.000Z'));
  readonly subscriptions = new InMemorySubscriptions();
  readonly plans = new CatalogPlans();
  readonly usage = new FixedUsage();
  readonly transactions = new InMemoryTransactionManager();
  readonly bus = new RecordingMessageBus(this.transactions);
  private readonly events = new SubscriptionEvents(this.bus, this.clock);
  private readonly shard = UnroutedShardScopes.create();
  readonly settings: BillingSettings;

  constructor() {
    const registry = new ConfigRegistry();
    registry.setRoot({
      BILLING_TRIAL_DAYS: SubscriptionsHarness.TRIAL_DAYS,
      BILLING_GRACE_DAYS: SubscriptionsHarness.GRACE_DAYS,
      BILLING_TRIAL_PLAN: CatalogPlans.TRIAL.code,
      BILLING_INVOICE_SERIES: SubscriptionsHarness.INVOICE_SERIES,
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

  /** The use case that closes an expired period. */
  closing(): CloseSubscriptionPeriod {
    return new CloseSubscriptionPeriod(
      this.subscriptions,
      this.plans,
      this.shard,
      this.transactions,
    );
  }

  /** The subscriptions module as the other billing modules see it, over the same doubles. */
  facade(): LocalSubscriptionsFacade {
    return new LocalSubscriptionsFacade(
      this.subscriptions,
      new SingleTenantMaintenance(
        SubscriptionsHarness.TENANT,
        this.subscriptions,
      ),
      this.plans,
      this.open(),
      this.closing(),
      this.standing(),
      this.shard,
    );
  }

  /** Stores a subscription to `plan` that is already active with its first period starting on `today`. */
  async seedActive(
    plan = CatalogPlans.BASIC,
    today = BillingPeriod.dateOf(this.clock.now()),
  ): Promise<void> {
    await this.subscriptions.insert(
      Subscription.open({
        id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
        plan,
        today,
        trialDays: 0,
      }),
    );
  }
}
