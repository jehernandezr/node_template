import {
  OPEN_PAYMENT_STATUSES,
  type PaymentAttempt,
} from '../../domain/payment-attempt.js';
import { PaymentAttempts } from '../../domain/payment-attempts.js';
import type { PaymentResult } from '../../domain/payment-provider.js';

/** In-memory `PaymentAttempts` with the same unique key per invoice and attempt number as the table. */
export class InMemoryPaymentAttempts extends PaymentAttempts {
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

  async findById(
    invoiceId: string,
    id: string,
  ): Promise<PaymentAttempt | undefined> {
    return this.all().find(
      (row) => row.id === id && row.invoiceId === invoiceId,
    );
  }

  async latest(invoiceId: string): Promise<PaymentAttempt | undefined> {
    return this.all()
      .filter((row) => row.invoiceId === invoiceId)
      .reduce<PaymentAttempt | undefined>(
        (last, row) =>
          last === undefined || row.attempt > last.attempt ? row : last,
        undefined,
      );
  }

  async resolve(id: string, result: PaymentResult): Promise<void> {
    for (const [key, row] of this.rows) {
      if (row.id === id && OPEN_PAYMENT_STATUSES.has(row.status)) {
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

/** The log of a process that crashes right after charging: the first provider response is not recorded. */
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
