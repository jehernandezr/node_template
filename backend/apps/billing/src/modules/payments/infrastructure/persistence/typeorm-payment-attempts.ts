import { Injectable } from '@nestjs/common';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { In } from 'typeorm';
import type { PaymentAttempt } from '../../domain/payment-attempt.js';
import { PaymentAttempts } from '../../domain/payment-attempts.js';
import type { PaymentResult } from '../../domain/payment-provider.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { PaymentAttemptEntity } from './entities/payment-attempt.entity.js';

/** `PaymentAttempts` sobre `payment_attempts` del shard del tenant. */
@Injectable()
export class TypeOrmPaymentAttempts
  extends TenantIsolatedRepository
  implements PaymentAttempts
{
  private static readonly OPEN = [
    PaymentStatus.Requested,
    PaymentStatus.Pending,
  ];

  constructor(kit: RepositoryKit) {
    super(kit);
  }

  /** `ON CONFLICT DO NOTHING`: un duplicado no aborta la transacción de quien llama, que puede seguir y leerlo. */
  async reserve(attempt: PaymentAttempt): Promise<boolean> {
    const actorId = this.kit.context.current().actorId ?? null;
    const row = Object.assign(new PaymentAttemptEntity(), {
      id: attempt.id,
      tenantId: this.tenantId(),
      createdBy: actorId,
      updatedBy: actorId,
      invoiceId: attempt.invoiceId,
      attempt: attempt.attempt,
      status: attempt.status,
      requestedAt: attempt.requestedAt,
      reference: attempt.reference ?? null,
      reason: attempt.reason ?? null,
    });
    const inserted = await this.write((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(PaymentAttemptEntity)
        .values(row)
        .orIgnore()
        .returning(['id'])
        .execute(),
    );
    return (inserted.raw as readonly unknown[]).length > 0;
  }

  async find(
    invoiceId: string,
    attempt: number,
  ): Promise<PaymentAttempt | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(PaymentAttemptEntity, { tenantId, invoiceId, attempt }),
    );
    return row === null ? undefined : TypeOrmPaymentAttempts.toDomain(row);
  }

  async resolve(id: string, result: PaymentResult): Promise<void> {
    const tenantId = this.tenantId();
    const updatedBy = this.kit.context.current().actorId ?? null;
    await this.write((manager) =>
      manager.update(
        PaymentAttemptEntity,
        { id, tenantId, status: In(TypeOrmPaymentAttempts.OPEN) },
        {
          status: result.status,
          reference: result.reference ?? null,
          reason: result.reason ?? null,
          updatedBy,
        },
      ),
    );
  }

  private static toDomain(row: PaymentAttemptEntity): PaymentAttempt {
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      attempt: row.attempt,
      status: row.status as PaymentStatus,
      requestedAt: row.requestedAt,
      ...(row.reference === null ? {} : { reference: row.reference }),
      ...(row.reason === null ? {} : { reason: row.reason }),
    };
  }
}
