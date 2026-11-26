import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator } from '@platform/kernel';
import type { PaymentAttempt } from '../domain/payment-attempt.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import {
  PaymentProvider,
  type ChargeRequest,
  type PaymentResult,
} from '../domain/payment-provider.js';
import { PaymentStatus } from '../domain/payment-status.enum.js';

/**
 * Charges an invoice attempt without ever charging it twice. The attempt is recorded as `Requested` before calling the
 * provider and its id travels as the idempotency key: if the process crashes between charging and recording the response, the
 * next run finds the open attempt and asks the provider instead of charging again. Since each attempt number
 * is recorded only once, two replicas requesting it at the same time do not both charge: the second one does not reserve it.
 */
@Injectable()
export class ChargeInvoice {
  /** An open attempt older than this is no longer in flight: whoever requested it crashed and it is resumed. */
  static readonly ABANDONED_AFTER_MS = 10 * 60_000;

  constructor(
    private readonly provider: PaymentProvider,
    private readonly attempts: PaymentAttempts,
    private readonly shard: ShardScopes,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Charges the attempt if nobody recorded it, returns the response if it is already resolved, or resumes an abandoned one
   * by asking the provider for its key before requesting it again.
   * @param request Invoice, attempt number and amount to charge.
   * @returns The provider response, or `Requested` if another run has the attempt in flight: that run applies
   *   its result.
   */
  async execute(request: ChargeRequest): Promise<PaymentResult> {
    const existing = await this.shard.inTenantShard(request.tenantId, () =>
      this.attempts.find(request.invoiceId, request.attempt),
    );
    if (existing === undefined) {
      return this.chargeNew(request);
    }
    if (existing.status !== PaymentStatus.Requested) {
      return { status: existing.status };
    }
    return this.resume(existing, request);
  }

  private async chargeNew(request: ChargeRequest): Promise<PaymentResult> {
    const attempt: PaymentAttempt = {
      id: this.ids.next().toString(),
      invoiceId: request.invoiceId,
      attempt: request.attempt,
      status: PaymentStatus.Requested,
      requestedAt: this.clock.now(),
    };
    const reserved = await this.shard.inTenantShard(request.tenantId, () =>
      this.attempts.reserve(attempt),
    );
    if (!reserved) {
      return { status: PaymentStatus.Requested };
    }
    return this.send(attempt.id, request);
  }

  private async resume(
    open: PaymentAttempt,
    request: ChargeRequest,
  ): Promise<PaymentResult> {
    const age = this.clock.now().getTime() - open.requestedAt.getTime();
    if (age < ChargeInvoice.ABANDONED_AFTER_MS) {
      return { status: PaymentStatus.Requested };
    }
    const answered = await this.provider.find(open.id);
    if (answered === undefined) {
      return this.send(open.id, request);
    }
    await this.resolve(request.tenantId, open.id, answered);
    return answered;
  }

  private async send(
    attemptId: string,
    request: ChargeRequest,
  ): Promise<PaymentResult> {
    const result = await this.provider.charge({ ...request, attemptId });
    await this.resolve(request.tenantId, attemptId, result);
    return result;
  }

  private resolve(
    tenantId: string,
    attemptId: string,
    result: PaymentResult,
  ): Promise<void> {
    return this.shard.inTenantShard(tenantId, () =>
      this.attempts.resolve(attemptId, result),
    );
  }
}
