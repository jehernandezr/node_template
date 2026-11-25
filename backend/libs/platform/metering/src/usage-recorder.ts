import type { UsageMetric } from '@contracts/billing';

/** Counts a tenant's metered usage to send it to billing. */
export abstract class UsageRecorder {
  abstract record(
    tenantId: string,
    metric: UsageMetric,
    quantity?: number,
  ): Promise<void>;
}
