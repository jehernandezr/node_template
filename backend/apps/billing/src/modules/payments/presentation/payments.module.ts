import { Global, Module } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import type { BillingConfig } from '../../../config/billing.config.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { ChargeInvoice } from '../application/charge-invoice.use-case.js';
import { LocalPaymentsFacade } from '../application/local-payments.facade.js';
import { PaymentsFacade } from '../application/payments.facade.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import { PaymentProvider } from '../domain/payment-provider.js';
import { FakePaymentProvider } from '../infrastructure/fake-payment-provider.js';
import { PaymentAttemptEntity } from '../infrastructure/persistence/entities/payment-attempt.entity.js';
import { TypeOrmPaymentAttempts } from '../infrastructure/persistence/typeorm-payment-attempts.js';

/** Cobro de facturas con el proveedor de `BILLING_PAYMENT_PROVIDER` y su bitácora. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [PaymentAttemptEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  providers: [
    TenantShard,
    {
      provide: PaymentProvider,
      useFactory: (config: AppConfig) =>
        new FakePaymentProvider(
          config.root<BillingConfig>().BILLING_FAKE_PAYMENT_OUTCOME,
        ),
      inject: [AppConfig],
    },
    { provide: PaymentAttempts, useClass: TypeOrmPaymentAttempts },
    ChargeInvoice,
    { provide: PaymentsFacade, useClass: LocalPaymentsFacade },
  ],
  exports: [PaymentsFacade],
})
export class PaymentsModule {}
