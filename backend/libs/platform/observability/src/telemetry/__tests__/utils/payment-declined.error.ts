import { PlatformError } from '@platform/kernel';

/** Test domain error with a valid code. */
export class PaymentDeclinedError extends PlatformError {
  readonly code = 'BILLING.PAYMENT.DECLINED';
}
