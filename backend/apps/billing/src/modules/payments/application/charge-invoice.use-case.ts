import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import {
  PaymentProvider,
  type ChargeRequest,
  type PaymentResult,
} from '../domain/payment-provider.js';

/**
 * Pide el cobro al proveedor fuera de cualquier transacción (es una llamada externa) y deja el intento en la
 * bitácora del tenant.
 */
@Injectable()
export class ChargeInvoice {
  constructor(
    private readonly provider: PaymentProvider,
    private readonly attempts: PaymentAttempts,
    private readonly shard: TenantShard,
    private readonly ids: IdGenerator,
  ) {}

  async execute(request: ChargeRequest): Promise<PaymentResult> {
    const result = await this.provider.charge(request);
    await this.shard.run(request.tenantId, () =>
      this.attempts.record(
        this.ids.next().toString(),
        request.invoiceId,
        result,
      ),
    );
    return result;
  }
}
