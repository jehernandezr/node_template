import { Currency } from '@contracts/billing';
import { FakePaymentOutcome } from '../../../../shared/enums/fake-payment-outcome.enum.js';
import { PaymentProviderKind } from '../../../../shared/enums/payment-provider-kind.enum.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { FakePaymentProvider } from '../fake-payment-provider.js';
import { PaymentProviderSelector } from '../payment-provider-selector.js';

const settingsWith = (outcome: FakePaymentOutcome) => ({
  BILLING_PAYMENT_PROVIDER: PaymentProviderKind.Fake,
  BILLING_FAKE_PAYMENT_OUTCOME: outcome,
});

describe('PaymentProviderSelector', () => {
  it('builds the fake provider with the configured outcome', async () => {
    const provider = new PaymentProviderSelector().select(
      settingsWith(FakePaymentOutcome.Pending),
    );

    expect(provider).toBeInstanceOf(FakePaymentProvider);
    await expect(
      provider.charge({
        attemptId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a11',
        tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
        invoiceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a12',
        invoiceNumber: 'INV-1',
        attempt: 1,
        amountMinor: 1_000,
        currency: Currency.Usd,
      }),
    ).resolves.toMatchObject({ status: PaymentStatus.Pending });
  });
});
