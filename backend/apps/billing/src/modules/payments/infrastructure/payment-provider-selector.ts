import type { BillingConfig } from '../../../config/billing.config.js';
import { PaymentProviderKind } from '../../../shared/enums/payment-provider-kind.enum.js';
import type { PaymentProvider } from '../domain/payment-provider.js';
import { FakePaymentProvider } from './fake-payment-provider.js';

/** Builds the charge provider that `BILLING_PAYMENT_PROVIDER` asks for. */
export class PaymentProviderSelector {
  /**
   * The provider of the configured kind; the fake one answers with `BILLING_FAKE_PAYMENT_OUTCOME`.
   * @param settings Payment provider kind and fake outcome from the configuration.
   * @returns The payment provider to inject.
   */
  select(
    settings: Pick<
      BillingConfig,
      'BILLING_PAYMENT_PROVIDER' | 'BILLING_FAKE_PAYMENT_OUTCOME'
    >,
  ): PaymentProvider {
    switch (settings.BILLING_PAYMENT_PROVIDER) {
      case PaymentProviderKind.Fake:
        return new FakePaymentProvider(settings.BILLING_FAKE_PAYMENT_OUTCOME);
    }
  }
}
