import type { UsageMetric } from '@contracts/billing';

/** Cuenta el uso medido de un tenant para enviarlo a billing. */
export abstract class UsageRecorder {
  abstract record(
    tenantId: string,
    metric: UsageMetric,
    quantity?: number,
  ): Promise<void>;
}
