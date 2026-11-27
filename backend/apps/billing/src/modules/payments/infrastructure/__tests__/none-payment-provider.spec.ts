import { Currency } from '@contracts/billing';
import type { PaymentProvider } from '../../domain/payment-provider.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { NonePaymentProvider } from '../none-payment-provider.js';

const ATTEMPT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a11';

describe('NonePaymentProvider', () => {
  it('never charges: every attempt stays pending', async () => {
    const provider: PaymentProvider = new NonePaymentProvider();

    await expect(
      provider.charge({
        attemptId: ATTEMPT,
        tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
        invoiceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a12',
        invoiceNumber: 'INV-1',
        attempt: 1,
        amountMinor: 1_000,
        currency: Currency.Usd,
      }),
    ).resolves.toEqual({ status: PaymentStatus.Pending });
    await expect(provider.find(ATTEMPT)).resolves.toEqual({
      status: PaymentStatus.Pending,
    });
  });
});
