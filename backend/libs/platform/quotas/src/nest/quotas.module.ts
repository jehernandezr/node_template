import { Global, Module } from '@nestjs/common';
import { InternalClient } from '@platform/internal-api';
import { Clock, IdGenerator } from '@platform/kernel';
import { BillingQuotaChecker } from '../billing-quota-checker.js';
import { QuotaChecker } from '../quota-checker.js';
import { QuotaGuard } from './quota.guard.js';

/**
 * Cuotas contra billing para `@Quota` y para los casos de uso que comprueban un límite antes de escribir.
 * El servicio declara el contrato de billing entre sus pares y su URL en `INTERNAL_API_BASE_URLS`.
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
