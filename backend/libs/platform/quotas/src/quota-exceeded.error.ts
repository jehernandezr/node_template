import { BillingErrorCode, type UsageMetric } from '@contracts/billing';
import { DomainError } from '@platform/kernel';

/**
 * El tenant llegó al límite de una métrica de su plan. Responde 403 con el código del contrato; `metric`,
 * `limit` y `used` quedan en los detalles internos del error y en los registros, no en el cuerpo de la
 * respuesta.
 */
export class QuotaExceededError extends DomainError {
  readonly code = BillingErrorCode.QuotaExceeded;

  constructor(metric: UsageMetric, limit: number, used: number) {
    super(`The ${metric} quota of the plan is exhausted`, {
      metric,
      limit,
      used,
    });
  }
}
