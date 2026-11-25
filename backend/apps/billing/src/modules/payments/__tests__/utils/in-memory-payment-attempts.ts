import type { PaymentAttempt } from '../../domain/payment-attempt.js';
import { PaymentAttempts } from '../../domain/payment-attempts.js';
import type { PaymentResult } from '../../domain/payment-provider.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';

/** `PaymentAttempts` en memoria con la misma llave única por factura y número de intento que la tabla. */
export class InMemoryPaymentAttempts extends PaymentAttempts {
  private static readonly OPEN: ReadonlySet<PaymentStatus> = new Set([
    PaymentStatus.Requested,
    PaymentStatus.Pending,
  ]);

  protected readonly rows = new Map<string, PaymentAttempt>();

  async reserve(attempt: PaymentAttempt): Promise<boolean> {
    const key = InMemoryPaymentAttempts.keyOf(
      attempt.invoiceId,
      attempt.attempt,
    );
    if (this.rows.has(key)) {
      return false;
    }
    this.rows.set(key, attempt);
    return true;
  }

  async find(
    invoiceId: string,
    attempt: number,
  ): Promise<PaymentAttempt | undefined> {
    return this.rows.get(InMemoryPaymentAttempts.keyOf(invoiceId, attempt));
  }

  async resolve(id: string, result: PaymentResult): Promise<void> {
    for (const [key, row] of this.rows) {
      if (row.id === id && InMemoryPaymentAttempts.OPEN.has(row.status)) {
        this.rows.set(key, { ...row, ...result });
      }
    }
  }

  all(): readonly PaymentAttempt[] {
    return [...this.rows.values()];
  }

  private static keyOf(invoiceId: string, attempt: number): string {
    return `${invoiceId}:${attempt}`;
  }
}

/** La bitácora de un proceso que cae justo después de cobrar: la primera respuesta del proveedor no se anota. */
export class CrashingAfterChargeAttempts extends InMemoryPaymentAttempts {
  private crashed = false;

  override async resolve(id: string, result: PaymentResult): Promise<void> {
    if (!this.crashed) {
      this.crashed = true;
      throw new Error('process died before recording the charge');
    }
    await super.resolve(id, result);
  }
}
