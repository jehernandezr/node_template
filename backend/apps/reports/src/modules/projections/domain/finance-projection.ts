import { InvoiceStatus, type Currency } from '@contracts/billing';
import type {
  NotificationChannel,
  NotificationType,
} from '@contracts/notifications';
import type { DeliveryPoint, InvoicePoint } from './projection-points.js';
import type { BucketedRange } from './report-range.js';

/**
 * Cuánto avanzó una factura en su cobro: una emitida puede fallar o pagarse, una fallida aún puede pagarse y
 * una pagada ya no cambia. Un evento atrasado con menos avance no devuelve la factura a un estado anterior.
 */
export class InvoiceProgress {
  private static readonly RANK: Readonly<Record<InvoiceStatus, number>> = {
    [InvoiceStatus.Draft]: 0,
    [InvoiceStatus.Issued]: 1,
    [InvoiceStatus.Void]: 1,
    [InvoiceStatus.Failed]: 2,
    [InvoiceStatus.Paid]: 3,
  };

  static rankOf(status: InvoiceStatus): number {
    return InvoiceProgress.RANK[status];
  }
}

/** Lo que se sabe de una factura por sus eventos; lo que un evento no trae no borra lo ya sabido. */
export interface InvoiceProjectionChange {
  readonly invoiceId: string;
  readonly status: InvoiceStatus;
  /** `InvoiceProgress.rankOf(status)`: decide si el cambio avanza la factura. */
  readonly progress: number;
  readonly number: string;
  readonly currency: Currency;
  readonly totalMinor: number;
  readonly issuedAt?: Date;
  readonly paidAt?: Date;
  readonly failedAt?: Date;
}

/** Una notificación creada y los canales por los que salió. */
export interface DeliveryProjectionChange {
  readonly notificationId: string;
  readonly type: NotificationType;
  readonly channels: readonly NotificationChannel[];
  readonly createdAt: Date;
}

/** Proyecciones de facturas y entregas del tenant del `ShardScope` abierto. */
export abstract class FinanceProjection {
  abstract applyInvoice(change: InvoiceProjectionChange): Promise<void>;
  abstract applyDelivery(change: DeliveryProjectionChange): Promise<void>;
  abstract invoices(range: BucketedRange): Promise<readonly InvoicePoint[]>;
  abstract deliveries(range: BucketedRange): Promise<readonly DeliveryPoint[]>;
}
