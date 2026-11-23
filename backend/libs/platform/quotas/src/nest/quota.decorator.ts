import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import type { UsageMetric } from '@contracts/billing';
import { QUOTA_METRIC } from './quota-metadata.js';
import { QuotaGuard } from './quota.guard.js';

/** Escribe los metadatos de `@Quota`. */
export class QuotaDecorator {
  static apply(metric: UsageMetric): MethodDecorator {
    return applyDecorators(
      SetMetadata(QUOTA_METRIC, metric),
      UseGuards(QuotaGuard),
    );
  }
}

/** `@Quota(UsageMetric.ApiCalls)`: la ruta consume la métrica y se rechaza cuando el plan la agotó. */
export const Quota = QuotaDecorator.apply;
