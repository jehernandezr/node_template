import { Injectable } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentsFacade, PaymentStatus } from '../../payments/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { InvoiceState } from '../domain/invoice.js';
import { SettleInvoice } from './settle-invoice.use-case.js';

/**
 * Cobra una factura a la que le toca cobro (recién emitida o con un reintento vencido) y aplica el resultado. Cada
 * intento lleva su número, así `payments` nunca lo cobra dos veces: si una corrida anterior ya lo cobró y cayó antes
 * de saldar, aquí se aplica esa respuesta. Un cobro en curso se deja al webhook o a la corrida siguiente.
 */
@Injectable()
export class CollectInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsFacade,
    private readonly settle: SettleInvoice,
    private readonly shard: TenantShard,
    private readonly clock: Clock,
    private readonly logger: LoggerPort,
  ) {}

  async execute(tenantId: string, invoiceId: string): Promise<void> {
    const invoice = await this.shard.run(tenantId, () =>
      this.invoices.find(invoiceId),
    );
    if (
      invoice === undefined ||
      !invoice.isDueForCollection(this.clock.now())
    ) {
      return;
    }
    const state = invoice.snapshot();
    const attempt = invoice.collectionAttempt();
    const status = await this.outcomeOf(tenantId, state, attempt);
    if (status === PaymentStatus.Approved) {
      await this.settle.paid(tenantId, invoiceId, this.clock.now());
    } else if (status === PaymentStatus.Declined) {
      await this.settle.failed(tenantId, invoiceId, this.clock.now(), attempt);
    }
  }

  /**
   * Una factura en cero o negativa queda saldada sin cobro: no se le pide al proveedor un cobro negativo. Un total
   * negativo sale de un precio de plan que cambió dentro del periodo; no hay saldo a favor que trasladar, así que se
   * deja en el log para que se emita una nota crédito a mano.
   */
  private async outcomeOf(
    tenantId: string,
    invoice: InvoiceState,
    attempt: number,
  ): Promise<PaymentStatus> {
    if (invoice.totalMinor < 0) {
      this.logger.warn('invoice with a negative total settled without charge', {
        tenantId,
        invoiceId: invoice.id,
        totalMinor: invoice.totalMinor,
      });
    }
    if (invoice.totalMinor <= 0) {
      return PaymentStatus.Approved;
    }
    const result = await this.payments.charge({
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      attempt,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
    });
    return result.status;
  }
}
