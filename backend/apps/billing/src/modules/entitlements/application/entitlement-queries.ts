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
 * Lo que el plan vigente de un tenant le permite y cuánto lleva usado en el periodo. Una métrica que el plan
 * no limita no tiene tope; una suscripción suspendida o cancelada no deja consumir nada.
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

  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` si el tenant no tiene suscripción. */
  async snapshot(tenantId: string): Promise<Entitlements> {
    const entitlements = await this.subscriptions.entitlements(tenantId);
    return {
      tenantId,
      status: entitlements.status,
      features: [...entitlements.features],
      quotas: [...entitlements.quotas],
    };
  }

  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` si el tenant no tiene suscripción. */
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

  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` si el tenant no tiene suscripción. */
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
