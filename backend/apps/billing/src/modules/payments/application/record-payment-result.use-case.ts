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
 * Records what the provider reported later through its webhook on the attempt the notice refers to, never on the one
 * that is due when the notice arrives: a repeated notice, or the webhook of a decline the job already recorded, does
 * not count as a new decline nor use up a retry. The attempt is the one named by `attemptId`; without it, the latest
 * one if it is still open or already has that same result, and if there is none the charge did not come from billing
 * and a new, already resolved attempt is recorded. A notice never resolves an attempt it does not name with a result
 * other than the recorded one: such a notice is refused and every attempt stays as it was.
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
   * Records the notice on its attempt.
   * @param notice Notice from the provider.
   * @returns The number of the attempt the notice belongs to.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` if `attemptId` is not an attempt of the invoice, or
   *   `BILLING.INVOICE.INVALID_STATE` if the notice contradicts the result already recorded for its attempt or the
   *   attempt it would take is open on behalf of another charge.
   */
  execute(notice: PaymentNotice): Promise<number> {
    return this.shard.run(notice.tenantId, async () => {
      const target = await this.targetOf(notice);
      if (target !== undefined && OPEN_PAYMENT_STATUSES.has(target.status)) {
        await this.attempts.resolve(target.id, notice.result);
        return target.attempt;
      }
      if (target !== undefined && notice.attemptId !== undefined) {
        return RecordPaymentResult.matching(target, notice);
      }
      if (target !== undefined && target.status === notice.result.status) {
        return target.attempt;
      }
      return this.recordUnmatched(notice);
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

  private async recordUnmatched(notice: PaymentNotice): Promise<number> {
    const recorded = await this.attempts.reserve({
      id: this.ids.next().toString(),
      invoiceId: notice.invoiceId,
      attempt: notice.nextAttempt,
      requestedAt: this.clock.now(),
      ...notice.result,
    });
    if (recorded) {
      return notice.nextAttempt;
    }
    const existing = await this.attempts.find(
      notice.invoiceId,
      notice.nextAttempt,
    );
    if (existing === undefined) {
      throw new BillingError(BillingErrorCode.InvoiceInvalidState, {
        attempt: notice.nextAttempt,
      });
    }
    return RecordPaymentResult.matching(existing, notice);
  }

  private static matching(
    attempt: PaymentAttempt,
    notice: PaymentNotice,
  ): number {
    if (attempt.status !== notice.result.status) {
      throw new BillingError(BillingErrorCode.InvoiceInvalidState, {
        attemptId: attempt.id,
        recorded: attempt.status,
        reported: notice.result.status,
      });
    }
    return attempt.attempt;
  }
}
