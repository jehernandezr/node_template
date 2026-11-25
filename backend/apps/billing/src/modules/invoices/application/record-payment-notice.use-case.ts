import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { TransactionManager } from '@platform/kernel';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentsFacade, PaymentStatus } from '../../payments/index.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { Invoice, InvoiceState } from '../domain/invoice.js';
import { SettleInvoice } from './settle-invoice.use-case.js';

/** Un pago que el proveedor confirma después de pedido. */
export interface PaidNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly paidAt: Date;
  readonly reference: string;
  readonly amount: { readonly amountMinor: number; readonly currency: string };
}

/** Un rechazo que el proveedor confirma después de pedido. */
export interface FailedNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly failedAt: Date;
  readonly reason?: string;
}

/**
 * Lo que el proveedor informa por su webhook: anota el resultado en el intento de cobro en curso, con su referencia o
 * su motivo, y lo aplica a la factura, todo en una transacción. El intento en curso se lee con la suscripción tomada,
 * así un cobro simultáneo no lo cambia a mitad. Un pago por un monto distinto del total se rechaza sin tocar nada.
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
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND`, `BILLING.INVOICE.INVALID_STATE` o
   *   `BILLING.INVOICE.AMOUNT_MISMATCH`.
   */
  paid(notice: PaidNotice): Promise<InvoiceState> {
    return this.inTransaction(
      notice.tenantId,
      notice.invoiceId,
      async (invoice) => {
        invoice.assertTotal(notice.amount);
        await this.payments.record(
          notice.tenantId,
          notice.invoiceId,
          invoice.collectionAttempt(),
          { status: PaymentStatus.Approved, reference: notice.reference },
        );
        return this.settle.paid(
          notice.tenantId,
          notice.invoiceId,
          notice.paidAt,
        );
      },
    );
  }

  /** @throws BillingError `BILLING.INVOICE.NOT_FOUND` o `BILLING.INVOICE.INVALID_STATE`. */
  failed(notice: FailedNotice): Promise<InvoiceState> {
    return this.inTransaction(
      notice.tenantId,
      notice.invoiceId,
      async (invoice) => {
        const attempt = invoice.collectionAttempt();
        await this.payments.record(notice.tenantId, notice.invoiceId, attempt, {
          status: PaymentStatus.Declined,
          ...(notice.reason === undefined ? {} : { reason: notice.reason }),
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
