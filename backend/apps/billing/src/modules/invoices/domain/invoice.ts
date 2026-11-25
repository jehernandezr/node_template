import {
  BillingErrorCode,
  InvoiceStatus,
  type Currency,
  type InvoiceLineKind,
} from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import type { CollectionRetrySchedule } from './collection-retry-schedule.js';

/** An invoice line in minor units of the invoice currency. */
export interface InvoiceLineState {
  readonly kind: InvoiceLineKind;
  readonly description: string;
  readonly amountMinor: number;
}

/** Full state of an invoice, as stored. */
export interface InvoiceState {
  readonly id: string;
  readonly number: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: InvoiceStatus;
  readonly currency: Currency;
  readonly lines: readonly InvoiceLineState[];
  readonly totalMinor: number;
  readonly issuedAt: Date;
  /** Rejected charges of the invoice; the next charge attempt is number `failedAttempts + 1`. */
  readonly failedAttempts: number;
  /** When it is due for collection: at issue time and after each rejection per the schedule. Without a value, it is not charged automatically. */
  readonly nextCollectionAt?: Date;
  readonly paidAt?: Date;
  readonly version?: number;
}

/**
 * An issued invoice and its collection: it is paid or rejected, retried on a schedule, and a late payment settles it
 * even if it failed before.
 */
export class Invoice {
  private constructor(private state: InvoiceState) {}

  /**
   * Issues an invoice with the total of its lines, ready to be charged immediately.
   * @param input Id, number, period, currency, lines and issue instant.
   * @returns The issued invoice, with no rejections.
   */
  static issue(input: {
    readonly id: string;
    readonly number: string;
    readonly periodStart: string;
    readonly periodEnd: string;
    readonly currency: Currency;
    readonly lines: readonly InvoiceLineState[];
    readonly now: Date;
  }): Invoice {
    return new Invoice({
      id: input.id,
      number: input.number,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: InvoiceStatus.Issued,
      currency: input.currency,
      lines: input.lines,
      totalMinor: input.lines.reduce((sum, line) => sum + line.amountMinor, 0),
      issuedAt: input.now,
      failedAttempts: 0,
      nextCollectionAt: input.now,
    });
  }

  /**
   * Rebuilds a stored invoice without validating again.
   * @param state State read from persistence.
   * @returns The invoice.
   */
  static rehydrate(state: InvoiceState): Invoice {
    return new Invoice(state);
  }

  /**
   * Returns the current state, to store or display it.
   * @returns The state, read-only.
   */
  snapshot(): InvoiceState {
    return this.state;
  }

  /**
   * Returns the number of the charge attempt that is due: each rejection opens the next one.
   * @returns `failedAttempts + 1`.
   */
  collectionAttempt(): number {
    return this.state.failedAttempts + 1;
  }

  /**
   * Indicates whether it is due for collection: unpaid and with its next charge overdue.
   * @param now Reference instant.
   * @returns `true` if it is issued or failed and `nextCollectionAt` has passed.
   */
  isDueForCollection(now: Date): boolean {
    const next = this.state.nextCollectionAt;
    return (
      (this.state.status === InvoiceStatus.Issued ||
        this.state.status === InvoiceStatus.Failed) &&
      next !== undefined &&
      next.getTime() <= now.getTime()
    );
  }

  /**
   * Checks that the amount paid is the invoice total in its currency.
   * @param amount Amount reported by the provider.
   * @throws BillingError `BILLING.INVOICE.AMOUNT_MISMATCH` if it does not match.
   */
  assertTotal(amount: { amountMinor: number; currency: string }): void {
    if (
      amount.amountMinor !== this.state.totalMinor ||
      amount.currency !== this.state.currency
    ) {
      throw new BillingError(BillingErrorCode.InvoiceAmountMismatch, {
        expected: {
          amountMinor: this.state.totalMinor,
          currency: this.state.currency,
        },
        received: amount,
      });
    }
  }

  /**
   * Settles the invoice, even if a previous charge was rejected.
   * @param at Payment instant.
   * @returns `false` if it was already paid.
   * @throws BillingError `BILLING.INVOICE.INVALID_STATE` if it is voided or a draft.
   */
  pay(at: Date): boolean {
    if (this.state.status === InvoiceStatus.Paid) {
      return false;
    }
    this.assertCollectable();
    this.state = {
      ...this.state,
      status: InvoiceStatus.Paid,
      paidAt: at,
      nextCollectionAt: undefined,
    };
    return true;
  }

  /**
   * Records the rejection of attempt `attempt` and schedules the next one according to `retries`.
   * @param at Rejection instant.
   * @param attempt Number of the rejected attempt.
   * @param retries Retry schedule.
   * @returns `false` if that rejection was already recorded: the job and the webhook can report the same one.
   * @throws BillingError `BILLING.INVOICE.INVALID_STATE` if it is paid, voided or a draft.
   */
  fail(at: Date, attempt: number, retries: CollectionRetrySchedule): boolean {
    this.assertCollectable();
    if (attempt <= this.state.failedAttempts) {
      return false;
    }
    this.state = {
      ...this.state,
      status: InvoiceStatus.Failed,
      failedAttempts: attempt,
      nextCollectionAt: retries.nextAfter(attempt, at),
    };
    return true;
  }

  private assertCollectable(): void {
    if (
      this.state.status !== InvoiceStatus.Issued &&
      this.state.status !== InvoiceStatus.Failed
    ) {
      throw new BillingError(BillingErrorCode.InvoiceInvalidState, {
        status: this.state.status,
      });
    }
  }
}
