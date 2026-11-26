import {
  BillingErrorCode,
  CheckQuotaOperation,
  type UsageMetric,
} from '@contracts/billing';
import type { InternalClient } from '@platform/internal-api';
import type { Clock, IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { BillingUnavailableError } from './billing-unavailable.error.js';
import type { QuotaCheck } from './quota-check.js';
import { QuotaChecker } from './quota-checker.js';

interface CachedUsage {
  readonly limit: number;
  readonly used: number;
  /** What billing answered for one unit: `false` also when the subscription is suspended or canceled. */
  readonly allowed: boolean;
  readonly expiresAt: number;
}

/**
 * Quotas through the `billing.quotas.check.v1` operation. Keeps the limit and usage of each tenant and metric
 * for `ttlMs` in the process, so the result can lag billing by up to that time; the requested amount is
 * compared here against what is stored. An `allowed: false` from billing with plenty of room is a blocked subscription and is
 * respected. A tenant without a subscription (the ones the platform seeds) has no quota.
 * What is stored is bounded to `maxEntries` by discarding the oldest entry, so that a process serving
 * many tenants does not grow without limit.
 */
export class BillingQuotaChecker extends QuotaChecker {
  static readonly DEFAULT_TTL_MS = 10_000;
  static readonly DEFAULT_MAX_ENTRIES = 10_000;

  private readonly cache = new Map<string, CachedUsage>();

  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ttlMs = BillingQuotaChecker.DEFAULT_TTL_MS,
    private readonly maxEntries = BillingQuotaChecker.DEFAULT_MAX_ENTRIES,
  ) {
    super();
  }

  /** @throws BillingUnavailableError if billing does not respond. */
  override async check(
    tenantId: string,
    metric: UsageMetric,
    requested = 1,
  ): Promise<QuotaCheck> {
    const usage = await this.usageOf(tenantId, metric);
    if (usage === undefined) {
      return { metric, limit: 0, used: 0, allowed: true };
    }
    return {
      metric,
      limit: usage.limit,
      used: usage.used,
      allowed: usage.allowed && usage.used + requested <= usage.limit,
    };
  }

  private async usageOf(
    tenantId: string,
    metric: UsageMetric,
  ): Promise<CachedUsage | undefined> {
    const key = `${tenantId}:${metric}`;
    const now = this.clock.now().getTime();
    const cached = this.cache.get(key);
    if (cached !== undefined && cached.expiresAt > now) {
      return cached;
    }
    this.cache.delete(key);
    const outcome = await this.client.call(
      CheckQuotaOperation,
      { tenantId, metric },
      { idempotencyKey: this.ids.next().toString() },
    );
    if (
      outcome.kind === CallOutcomeKind.BusinessError &&
      outcome.code === BillingErrorCode.SubscriptionNotFound
    ) {
      return undefined;
    }
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new BillingUnavailableError(CheckQuotaOperation.id, outcome.kind);
    }
    const fresh = {
      limit: outcome.value.limit,
      used: outcome.value.used,
      allowed: outcome.value.allowed,
      expiresAt: now + this.ttlMs,
    };
    this.keep(key, fresh);
    return fresh;
  }

  /**
   * The `Map` iterates in insertion order and each key is reinserted when refreshed, so the first one is
   * the one that has gone longest without querying billing.
   */
  private keep(key: string, usage: CachedUsage): void {
    const oldest = this.cache.keys().next();
    if (this.cache.size >= this.maxEntries && oldest.done !== true) {
      this.cache.delete(oldest.value);
    }
    this.cache.set(key, usage);
  }
}
