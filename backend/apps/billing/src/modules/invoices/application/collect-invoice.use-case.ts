import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@contracts/billing';
import { Clock } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentsFacade, PaymentStatus } from '../../payments/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { InvoiceState } from '../domain/invoice.js';
import { SettleInvoice } from './settle-invoice.use-case.js';

/**
 * Cobra una factura emitida y aplica el resultado. Si ya hubo un intento (el proceso cayó después de cobrar y
 * antes de saldar), aplica ese resultado en vez de cobrar otra vez; un cobro en curso se deja al webhook.
 */
@Injectable()
export class CollectInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsFacade,
    private readonly settle: SettleInvoice,
    private readonly shard: TenantShard,
    private readonly clock: Clock,
  ) {}

  async execute(tenantId: string, invoiceId: string): Promise<void> {
    const invoice = await this.shard.run(tenantId, () =>
      this.invoices.find(invoiceId),
    );
    const state = invoice?.snapshot();
    if (state?.status !== InvoiceStatus.Issued) {
      return;
    }
    const status = await this.outcomeOf(tenantId, state);
    if (status === PaymentStatus.Approved) {
      await this.settle.paid(tenantId, invoiceId, this.clock.now());
    } else if (status === PaymentStatus.Declined) {
      await this.settle.failed(tenantId, invoiceId, this.clock.now());
    }
  }

  /**
   * Una factura en cero queda saldada sin cobro. Ninguna queda a favor del tenant: el crédito de un cambio de
   * plan es la parte no usada del cargo que el periodo ya cobra, así que nunca lo supera; si un dato corrupto
   * diera un total negativo, tampoco se le pide al proveedor un cobro negativo.
   */
  private async outcomeOf(
    tenantId: string,
    invoice: InvoiceState,
  ): Promise<PaymentStatus> {
    if (invoice.totalMinor <= 0) {
      return PaymentStatus.Approved;
    }
    const previous = await this.payments.lastStatus(tenantId, invoice.id);
    if (previous !== undefined) {
      return previous;
    }
    const result = await this.payments.charge({
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
    });
    return result.status;
  }
}
