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
  /** Lo que billing respondió para una unidad: `false` también cuando la suscripción está suspendida o cancelada. */
  readonly allowed: boolean;
  readonly expiresAt: number;
}

/**
 * Cuotas por la operación `billing.quotas.check.v1`. Guarda el límite y el uso de cada tenant y métrica
 * `ttlMs` en el proceso, así que el resultado puede ir hasta ese tiempo detrás de billing; lo pedido se
 * compara aquí contra lo guardado. Un `allowed: false` de billing con cupo de sobra es una suscripción bloqueada y se
 * respeta. Un tenant sin suscripción (los que siembra la plataforma) no tiene cuota.
 * Lo guardado se acota a `maxEntries` descartando la entrada más antigua, para que un proceso que atiende
 * muchos tenants no crezca sin límite.
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

  /** @throws BillingUnavailableError si billing no responde. */
  async check(
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
   * El `Map` recorre en orden de inserción y cada llave se reinserta al refrescarse, así que la primera es
   * la que lleva más tiempo sin consultarse a billing.
   */
  private keep(key: string, usage: CachedUsage): void {
    const oldest = this.cache.keys().next();
    if (this.cache.size >= this.maxEntries && oldest.done !== true) {
      this.cache.delete(oldest.value);
    }
    this.cache.set(key, usage);
  }
}
