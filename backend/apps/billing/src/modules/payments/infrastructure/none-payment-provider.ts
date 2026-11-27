import {
  PaymentProvider,
  type PaymentResult,
} from '../domain/payment-provider.js';
import { PaymentStatus } from '../domain/payment-status.enum.js';

/**
 * Provider of the environments without a real one (`BILLING_PAYMENT_PROVIDER=none`): it never charges and answers every
 * attempt as pending, so a closed period leaves its invoice issued, no invoice becomes paid or failed and delinquency
 * never starts.
 */
export class NonePaymentProvider extends PaymentProvider {
  private static readonly NEVER_CHARGED: PaymentResult = {
    status: PaymentStatus.Pending,
  };

  override async charge(): Promise<PaymentResult> {
    return NonePaymentProvider.NEVER_CHARGED;
  }

  override async find(): Promise<PaymentResult> {
    return NonePaymentProvider.NEVER_CHARGED;
  }
}
