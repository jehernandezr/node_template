import { BillingErrorCode, type UsageMetric } from '@contracts/billing';
import { DomainError } from '@platform/kernel';

/**
 * The tenant reached the limit of a metric of its plan. Responds 403 with the contract code; `metric`,
 * `limit` and `used` stay in the error's internal details and in the logs, not in the response
 * body.
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
