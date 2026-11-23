import type { UsageMetric } from '@contracts/billing';
import type { QuotaCheck } from './quota-check.js';
import { QuotaExceededError } from './quota-exceeded.error.js';

/** Consulta las cuotas del plan vigente de un tenant. */
export abstract class QuotaChecker {
  /** Si el tenant puede consumir `requested` (1 por defecto) más de la métrica. */
  abstract check(
    tenantId: string,
    metric: UsageMetric,
    requested?: number,
  ): Promise<QuotaCheck>;

  /** @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` si lo pedido no cabe en la cuota. */
  async enforce(
    tenantId: string,
    metric: UsageMetric,
    requested?: number,
  ): Promise<void> {
    const quota = await this.check(tenantId, metric, requested);
    if (!quota.allowed) {
      throw new QuotaExceededError(metric, quota.limit, quota.used);
    }
  }
}
