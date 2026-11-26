import { InvoiceStatus, type Currency } from '@contracts/billing';
import type {
  NotificationChannel,
  NotificationType,
} from '@contracts/notifications';
import type { DeliveryPoint, InvoicePoint } from './projection-points.js';
import type { BucketedRange } from './report-range.js';

/**
 * How far an invoice has progressed in its collection: an issued one can fail or be paid, a failed one can still be paid and
 * a paid one no longer changes. A late event with less progress does not return the invoice to an earlier status.
 */
export class InvoiceProgress {
  private static readonly RANK: Readonly<Record<InvoiceStatus, number>> = {
    [InvoiceStatus.Draft]: 0,
    [InvoiceStatus.Issued]: 1,
    [InvoiceStatus.Void]: 1,
    [InvoiceStatus.Failed]: 2,
    [InvoiceStatus.Paid]: 3,
  };

  /**
   * Orders invoice statuses so a late message never moves an invoice back.
   * @param status Invoice status.
   * @returns Its rank; higher is later.
   */
  static rankOf(status: InvoiceStatus): number {
    return InvoiceProgress.RANK[status];
  }
}

/** What is known about an invoice from its events; what an event does not carry does not erase what is already known. */
export interface InvoiceProjectionChange {
  readonly invoiceId: string;
  readonly status: InvoiceStatus;
  /** `InvoiceProgress.rankOf(status)`: decides whether the change advances the invoice. */
  readonly progress: number;
  readonly number: string;
  readonly currency: Currency;
  readonly totalMinor: number;
  readonly issuedAt?: Date;
  readonly paidAt?: Date;
  readonly failedAt?: Date;
}

/** A created notification and the channels it went out through. */
export interface DeliveryProjectionChange {
  readonly notificationId: string;
  readonly type: NotificationType;
  readonly channels: readonly NotificationChannel[];
  readonly createdAt: Date;
}

/** Invoice and delivery projections of the tenant of the open `ShardScope`. */
export abstract class FinanceProjection {
  /**
   * Applies an invoice change without going backwards.
   * @param change Invoice change.
   */
  abstract applyInvoice(change: InvoiceProjectionChange): Promise<void>;
  /**
   * Applies a notification delivery.
   * @param change Delivery change.
   */
  abstract applyDelivery(change: DeliveryProjectionChange): Promise<void>;
  /**
   * Sums the invoices per bucket.
   * @param range Report range with its bucket.
   * @returns One point per bucket.
   */
  abstract invoices(range: BucketedRange): Promise<readonly InvoicePoint[]>;
  /**
   * Counts the deliveries per bucket.
   * @param range Report range with its bucket.
   * @returns One point per bucket.
   */
  abstract deliveries(range: BucketedRange): Promise<readonly DeliveryPoint[]>;
}
