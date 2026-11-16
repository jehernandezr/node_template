import { PlatformError } from '@platform/kernel';

/** Error de dominio de prueba con código válido. */
export class PaymentDeclinedError extends PlatformError {
  readonly code = 'BILLING.PAYMENT.DECLINED';
}
