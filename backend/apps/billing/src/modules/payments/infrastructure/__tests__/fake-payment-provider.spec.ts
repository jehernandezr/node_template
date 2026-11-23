import { Currency } from '@contracts/billing';
import { FakePaymentOutcome } from '../../../../shared/enums/fake-payment-outcome.enum.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { FakePaymentProvider } from '../fake-payment-provider.js';

const request = {
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
  invoiceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
  invoiceNumber: 'FAC-000001',
  amountMinor: 49_900,
  currency: Currency.Cop,
};

describe('FakePaymentProvider', () => {
  it.each([
    [
      FakePaymentOutcome.Approved,
      { status: PaymentStatus.Approved, reference: 'fake-FAC-000001' },
    ],
    [
      FakePaymentOutcome.Declined,
      { status: PaymentStatus.Declined, reason: 'card_declined' },
    ],
    [FakePaymentOutcome.Pending, { status: PaymentStatus.Pending }],
  ])('answers %s as configured', async (outcome, expected) => {
    await expect(
      new FakePaymentProvider(outcome).charge(request),
    ).resolves.toEqual(expected);
  });
});
