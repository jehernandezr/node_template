import { Injectable } from '@nestjs/common';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { In } from 'typeorm';
import {
  OPEN_PAYMENT_STATUSES,
  type PaymentAttempt,
} from '../../domain/payment-attempt.js';
import { PaymentAttempts } from '../../domain/payment-attempts.js';
import type { PaymentResult } from '../../domain/payment-provider.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { PaymentAttemptEntity } from './entities/payment-attempt.entity.js';

/** `PaymentAttempts` over `payment_attempts` of the tenant shard. */
@Injectable()
export class TypeOrmPaymentAttempts
  extends TenantIsolatedRepository
  implements PaymentAttempts
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  /**
   * Inserts the attempt with `ON CONFLICT DO NOTHING`: a duplicate does not abort the caller's transaction.
   * @param attempt Attempt to record.
   * @returns `false` if that attempt number was already recorded.
   */
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

  /**
   * Reads the invoice attempt with that number, on the primary.
   * @param invoiceId Invoice of the attempt.
   * @param attempt Attempt number.
   * @returns The attempt, or `undefined` if it is not recorded.
   */
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

  /**
   * Reads the attempt with that id if it belongs to the invoice, on the primary.
   * @param invoiceId Invoice it must belong to.
   * @param id Attempt id.
   * @returns The attempt, or `undefined` if it does not exist or belongs to another invoice.
   */
  async findById(
    invoiceId: string,
    id: string,
  ): Promise<PaymentAttempt | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(PaymentAttemptEntity, { tenantId, invoiceId, id }),
    );
    return row === null ? undefined : TypeOrmPaymentAttempts.toDomain(row);
  }

  /**
   * Reads the invoice attempt with the highest number, on the primary.
   * @param invoiceId Invoice of the attempts.
   * @returns The last attempt, or `undefined` if it has none.
   */
  async latest(invoiceId: string): Promise<PaymentAttempt | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOne(PaymentAttemptEntity, {
        where: { tenantId, invoiceId },
        order: { attempt: 'DESC' },
      }),
    );
    return row === null ? undefined : TypeOrmPaymentAttempts.toDomain(row);
  }

  /**
   * Stores the response only if the attempt is still open: an `UPDATE` conditioned on the state.
   * @param id Attempt id.
   * @param result Provider response.
   */
  async resolve(id: string, result: PaymentResult): Promise<void> {
    const tenantId = this.tenantId();
    const updatedBy = this.kit.context.current().actorId ?? null;
    await this.write((manager) =>
      manager.update(
        PaymentAttemptEntity,
        { id, tenantId, status: In([...OPEN_PAYMENT_STATUSES]) },
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
