import { Injectable } from '@nestjs/common';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { PaymentAttempts } from '../../domain/payment-attempts.js';
import type { PaymentResult } from '../../domain/payment-provider.js';
import type { PaymentStatus } from '../../domain/payment-status.enum.js';
import { PaymentAttemptEntity } from './entities/payment-attempt.entity.js';

/** `PaymentAttempts` sobre `payment_attempts` del shard del tenant. */
@Injectable()
export class TypeOrmPaymentAttempts
  extends TenantIsolatedRepository
  implements PaymentAttempts
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async record(
    id: string,
    invoiceId: string,
    result: PaymentResult,
  ): Promise<void> {
    await this.insertOwned(
      PaymentAttemptEntity,
      Object.assign(new PaymentAttemptEntity(), {
        id,
        invoiceId,
        status: result.status,
        reference: result.reference ?? null,
        reason: result.reason ?? null,
      }),
    );
  }

  async lastStatus(invoiceId: string): Promise<PaymentStatus | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOne(PaymentAttemptEntity, {
        where: { tenantId, invoiceId },
        order: { id: 'DESC' },
      }),
    );
    return row === null ? undefined : (row.status as PaymentStatus);
  }
}
