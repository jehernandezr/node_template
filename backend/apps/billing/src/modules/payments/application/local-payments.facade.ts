import { Injectable } from '@nestjs/common';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';
import type { PaymentStatus } from '../domain/payment-status.enum.js';
import { ChargeInvoice } from './charge-invoice.use-case.js';
import { PaymentsFacade } from './payments.facade.js';

/** `PaymentsFacade` en el mismo proceso. */
@Injectable()
export class LocalPaymentsFacade extends PaymentsFacade {
  constructor(
    private readonly chargeInvoice: ChargeInvoice,
    private readonly attempts: PaymentAttempts,
    private readonly shard: TenantShard,
  ) {
    super();
  }

  charge(request: ChargeRequest): Promise<PaymentResult> {
    return this.chargeInvoice.execute(request);
  }

  lastStatus(
    tenantId: string,
    invoiceId: string,
  ): Promise<PaymentStatus | undefined> {
    return this.shard.run(tenantId, () => this.attempts.lastStatus(invoiceId));
  }
}
