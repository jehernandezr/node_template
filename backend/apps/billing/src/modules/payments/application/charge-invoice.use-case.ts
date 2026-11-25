import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import type { PaymentAttempt } from '../domain/payment-attempt.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import {
  PaymentProvider,
  type ChargeRequest,
  type PaymentResult,
} from '../domain/payment-provider.js';
import { PaymentStatus } from '../domain/payment-status.enum.js';

/**
 * Cobra un intento de una factura sin cobrarlo nunca dos veces. El intento se anota en `Requested` antes de llamar al
 * proveedor y su id viaja como llave de idempotencia: si el proceso cae entre cobrar y anotar la respuesta, la
 * corrida siguiente encuentra el intento abierto y le pregunta al proveedor en vez de cobrar de nuevo. Como cada número
 * de intento se anota una sola vez, dos réplicas que lo pidan a la vez no cobran las dos: la segunda no lo reserva.
 */
@Injectable()
export class ChargeInvoice {
  /** Un intento abierto más viejo que esto ya no está en vuelo: quien lo pidió cayó y se retoma. */
  static readonly ABANDONED_AFTER_MS = 10 * 60_000;

  constructor(
    private readonly provider: PaymentProvider,
    private readonly attempts: PaymentAttempts,
    private readonly shard: TenantShard,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /** `Requested` si otra corrida tiene el intento en vuelo: su resultado lo aplica ella. */
  async execute(request: ChargeRequest): Promise<PaymentResult> {
    const existing = await this.shard.run(request.tenantId, () =>
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
    const reserved = await this.shard.run(request.tenantId, () =>
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
    return this.shard.run(tenantId, () =>
      this.attempts.resolve(attemptId, result),
    );
  }
}
