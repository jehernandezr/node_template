import { Global, Module } from '@nestjs/common';
import { InternalClient } from '@platform/internal-api';
import { Clock, IdGenerator } from '@platform/kernel';
import { BillingQuotaChecker } from '../billing-quota-checker.js';
import { QuotaChecker } from '../quota-checker.js';
import { QuotaGuard } from './quota.guard.js';

/**
 * Quotas against billing for `@Quota` and for the use cases that check a limit before writing.
 * The service declares the billing contract among its peers and its URL in `INTERNAL_API_BASE_URLS`.
 */
@Global()
@Module({
  providers: [
    {
      provide: QuotaChecker,
      useFactory: (client: InternalClient, ids: IdGenerator, clock: Clock) =>
        new BillingQuotaChecker(client, ids, clock),
      inject: [InternalClient, IdGenerator, Clock],
    },
    QuotaGuard,
  ],
  exports: [QuotaChecker, QuotaGuard],
})
export class QuotasModule {}
