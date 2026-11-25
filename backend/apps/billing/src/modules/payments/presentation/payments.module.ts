import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ChargeInvoice } from '../application/charge-invoice.use-case.js';
import { LocalPaymentsFacade } from '../application/local-payments.facade.js';
import { PaymentsFacade } from '../application/payments.facade.js';
import { RecordPaymentResult } from '../application/record-payment-result.use-case.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import { PaymentProvider } from '../domain/payment-provider.js';
import { PaymentProviderSelector } from '../infrastructure/payment-provider-selector.js';
import { PaymentAttemptEntity } from '../infrastructure/persistence/entities/payment-attempt.entity.js';
import { TypeOrmPaymentAttempts } from '../infrastructure/persistence/typeorm-payment-attempts.js';
import { BillingSettings } from '../../../config/billing-settings.js';

/** Invoice charging with the `BILLING_PAYMENT_PROVIDER` provider and its log. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [PaymentAttemptEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  providers: [
    BillingSettings,
    {
      provide: PaymentProvider,
      useFactory: (settings: BillingSettings) =>
        new PaymentProviderSelector().select(settings.values),
      inject: [BillingSettings],
    },
    { provide: PaymentAttempts, useClass: TypeOrmPaymentAttempts },
    ChargeInvoice,
    RecordPaymentResult,
    { provide: PaymentsFacade, useClass: LocalPaymentsFacade },
  ],
  exports: [PaymentsFacade],
})
export class PaymentsModule {}
