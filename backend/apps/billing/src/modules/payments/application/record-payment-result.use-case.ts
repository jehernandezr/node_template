import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { Clock, IdGenerator } from '@platform/kernel';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import {
  OPEN_PAYMENT_STATUSES,
  type PaymentAttempt,
} from '../domain/payment-attempt.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import type { PaymentNotice } from './payments.facade.js';

/**
 * Anota lo que el proveedor informó después por su webhook en el intento al que se refiere, nunca en el que toque al
 * momento del aviso: así un aviso repetido, o el webhook de un rechazo que el job ya anotó, no cuenta como un rechazo
 * nuevo ni gasta un reintento. El intento es el de `attemptId`; sin él, el último si sigue abierto o si ya tiene ese
 * mismo resultado. Si no hay ninguno, el cobro no salió de billing y se anota uno nuevo ya resuelto.
 */
@Injectable()
export class RecordPaymentResult {
  constructor(
    private readonly attempts: PaymentAttempts,
    private readonly shard: TenantShard,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Anota el aviso en su intento.
   * @param notice Aviso del proveedor.
   * @returns El número del intento al que corresponde el aviso.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` si `attemptId` no es un intento de la factura.
   */
  execute(notice: PaymentNotice): Promise<number> {
    return this.shard.run(notice.tenantId, async () => {
      const target = await this.targetOf(notice);
      if (target !== undefined && OPEN_PAYMENT_STATUSES.has(target.status)) {
        await this.attempts.resolve(target.id, notice.result);
        return target.attempt;
      }
      if (target !== undefined && target.status === notice.result.status) {
        return target.attempt;
      }
      await this.recordUnmatched(notice);
      return notice.nextAttempt;
    });
  }

  private async targetOf(
    notice: PaymentNotice,
  ): Promise<PaymentAttempt | undefined> {
    if (notice.attemptId === undefined) {
      return this.attempts.latest(notice.invoiceId);
    }
    const attempt = await this.attempts.findById(
      notice.invoiceId,
      notice.attemptId,
    );
    if (attempt === undefined) {
      throw new BillingError(BillingErrorCode.InvoiceNotFound, {
        attemptId: notice.attemptId,
      });
    }
    return attempt;
  }

  private async recordUnmatched(notice: PaymentNotice): Promise<void> {
    const recorded = await this.attempts.reserve({
      id: this.ids.next().toString(),
      invoiceId: notice.invoiceId,
      attempt: notice.nextAttempt,
      requestedAt: this.clock.now(),
      ...notice.result,
    });
    if (recorded) {
      return;
    }
    const existing = await this.attempts.find(
      notice.invoiceId,
      notice.nextAttempt,
    );
    if (existing !== undefined) {
      await this.attempts.resolve(existing.id, notice.result);
    }
  }
}
