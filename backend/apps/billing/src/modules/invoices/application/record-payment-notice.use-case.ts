import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { TransactionManager } from '@platform/kernel';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import {
  PaymentsFacade,
  PaymentStatus,
  type PaymentNotice,
} from '../../payments/index.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { Invoice, InvoiceState } from '../domain/invoice.js';
import { SettleInvoice } from './settle-invoice.use-case.js';

/** Un pago que el proveedor confirma después de pedido. */
export interface PaidNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  /** Intento que el proveedor recibió como llave de idempotencia, si el cobro salió de billing. */
  readonly attemptId?: string;
  readonly paidAt: Date;
  readonly reference: string;
  readonly amount: { readonly amountMinor: number; readonly currency: string };
}

/** Un rechazo que el proveedor confirma después de pedido. */
export interface FailedNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  /** Intento que el proveedor recibió como llave de idempotencia, si el cobro salió de billing. */
  readonly attemptId?: string;
  readonly failedAt: Date;
  readonly reason?: string;
}

/**
 * Lo que el proveedor informa por su webhook: anota el resultado en el intento al que se refiere el aviso, con su
 * referencia o su motivo, y lo aplica a la factura, todo en una transacción con la suscripción tomada. El intento sale
 * del aviso y no del estado de la factura: un aviso repetido no cuenta como un rechazo nuevo ni gasta un reintento. Un
 * pago por un monto distinto del total se rechaza sin tocar nada.
 */
@Injectable()
export class RecordPaymentNotice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsFacade,
    private readonly settle: SettleInvoice,
    private readonly subscriptions: SubscriptionsFacade,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Anota el pago en su intento y salda la factura; repetir el aviso no cambia nada.
   * @param notice Pago informado por el proveedor.
   * @returns La factura después del aviso.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` si la factura o el intento no existen,
   *   `BILLING.INVOICE.INVALID_STATE` si está anulada o `BILLING.INVOICE.AMOUNT_MISMATCH` si el monto no es el total.
   */
  paid(notice: PaidNotice): Promise<InvoiceState> {
    return this.inTransaction(
      notice.tenantId,
      notice.invoiceId,
      async (invoice) => {
        invoice.assertTotal(notice.amount);
        await this.payments.record({
          ...RecordPaymentNotice.attemptOf(notice, invoice),
          result: {
            status: PaymentStatus.Approved,
            reference: notice.reference,
          },
        });
        return this.settle.paid(
          notice.tenantId,
          notice.invoiceId,
          notice.paidAt,
        );
      },
    );
  }

  /**
   * Anota el rechazo en su intento y lo aplica a la factura una sola vez: un aviso repetido, o el webhook de un rechazo
   * que el job ya anotó, no programa otro reintento.
   * @param notice Rechazo informado por el proveedor.
   * @returns La factura después del aviso.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` si la factura o el intento no existen, o
   *   `BILLING.INVOICE.INVALID_STATE` si ya está pagada o anulada.
   */
  failed(notice: FailedNotice): Promise<InvoiceState> {
    return this.inTransaction(
      notice.tenantId,
      notice.invoiceId,
      async (invoice) => {
        const attempt = await this.payments.record({
          ...RecordPaymentNotice.attemptOf(notice, invoice),
          result: {
            status: PaymentStatus.Declined,
            ...(notice.reason === undefined ? {} : { reason: notice.reason }),
          },
        });
        return this.settle.failed(
          notice.tenantId,
          notice.invoiceId,
          notice.failedAt,
          attempt,
        );
      },
    );
  }

  private static attemptOf(
    notice: PaidNotice | FailedNotice,
    invoice: Invoice,
  ): Omit<PaymentNotice, 'result'> {
    return {
      tenantId: notice.tenantId,
      invoiceId: notice.invoiceId,
      nextAttempt: invoice.collectionAttempt(),
      ...(notice.attemptId === undefined
        ? {}
        : { attemptId: notice.attemptId }),
    };
  }

  private inTransaction(
    tenantId: string,
    invoiceId: string,
    apply: (invoice: Invoice) => Promise<InvoiceState>,
  ): Promise<InvoiceState> {
    return this.shard.run(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.subscriptions.lock(tenantId);
        const invoice = await this.invoices.find(invoiceId);
        if (invoice === undefined) {
          throw new BillingError(BillingErrorCode.InvoiceNotFound);
        }
        return apply(invoice);
      }),
    );
  }
}
