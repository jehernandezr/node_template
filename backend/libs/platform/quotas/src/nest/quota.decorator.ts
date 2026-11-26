import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import type { UsageMetric } from '@contracts/billing';
import { QUOTA_METRIC } from './quota-metadata.js';
import { QuotaGuard } from './quota.guard.js';

/** Writes the `@Quota` metadata. */
export class QuotaDecorator {
  /**
   * Builds the decorator that checks a quota before the handler runs.
   * @param metric Metric the route consumes.
   * @returns The method decorator.
   */
  static apply(metric: UsageMetric): MethodDecorator {
    return applyDecorators(
      SetMetadata(QUOTA_METRIC, metric),
      UseGuards(QuotaGuard),
    );
  }
}

/** `@Quota(UsageMetric.ApiCalls)`: the route consumes the metric and is rejected when the plan has exhausted it. */
export const Quota = QuotaDecorator.apply;
