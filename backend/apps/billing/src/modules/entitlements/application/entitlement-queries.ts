import { Injectable } from '@nestjs/common';
import {
  SubscriptionStatus,
  type Entitlements,
  type QuotaCheck,
  type UsageMetric,
  type UsageOverview,
} from '@contracts/billing';
import {
  SubscriptionsFacade,
  type CurrentSubscription,
} from '../../subscriptions/index.js';
import { UsageFacade, type UsageLevel } from '../../usage/index.js';

/**
 * What a tenant's current plan allows and how much it has used in the period. A metric the plan does
 * not limit has no cap; a suspended or canceled subscription allows no consumption.
 */
@Injectable()
export class EntitlementQueries {
  private static readonly BLOCKED: ReadonlySet<SubscriptionStatus> = new Set([
    SubscriptionStatus.Suspended,
    SubscriptionStatus.Canceled,
  ]);

  constructor(
    private readonly subscriptions: SubscriptionsFacade,
    private readonly usage: UsageFacade,
  ) {}

  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription. */
  async snapshot(tenantId: string): Promise<Entitlements> {
    const entitlements = await this.subscriptions.entitlements(tenantId);
    return {
      tenantId,
      status: entitlements.status,
      features: [...entitlements.features],
      quotas: [...entitlements.quotas],
    };
  }

  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription. */
  async check(
    tenantId: string,
    metric: UsageMetric,
    requested = 1,
  ): Promise<QuotaCheck> {
    const current = await this.subscriptions.current(tenantId);
    const used = EntitlementQueries.usedOf(
      await this.levelsOf(tenantId, current),
      metric,
    );
    const limit = current.plan.limitOf(metric) ?? Number.MAX_SAFE_INTEGER;
    return {
      metric,
      limit,
      used,
      allowed:
        !EntitlementQueries.BLOCKED.has(current.subscription.status) &&
        used + requested <= limit,
    };
  }

  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription. */
  async overview(tenantId: string): Promise<UsageOverview> {
    const current = await this.subscriptions.current(tenantId);
    const levels = await this.levelsOf(tenantId, current);
    return {
      items: current.plan.snapshot().quotas.map((quota) => ({
        metric: quota.metric,
        limit: quota.limit,
        used: EntitlementQueries.usedOf(levels, quota.metric),
      })),
    };
  }

  private levelsOf(
    tenantId: string,
    current: CurrentSubscription,
  ): Promise<readonly UsageLevel[]> {
    return this.usage.levels(
      tenantId,
      current.subscription.period.start,
      current.subscription.period.end,
    );
  }

  private static usedOf(
    levels: readonly UsageLevel[],
    metric: UsageMetric,
  ): number {
    return levels.find((level) => level.metric === metric)?.used ?? 0;
  }
}
