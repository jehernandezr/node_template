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

/** `PaymentAttempts` sobre `payment_attempts` del shard del tenant. */
@Injectable()
export class TypeOrmPaymentAttempts
  extends TenantIsolatedRepository
  implements PaymentAttempts
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  /**
   * Inserta el intento con `ON CONFLICT DO NOTHING`: un duplicado no aborta la transacción de quien llama.
   * @param attempt Intento a anotar.
   * @returns `false` si ese número de intento ya estaba anotado.
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
   * Lee el intento de la factura con ese número, en la primaria.
   * @param invoiceId Factura del intento.
   * @param attempt Número del intento.
   * @returns El intento, o `undefined` si no está anotado.
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
   * Lee el intento con ese id si es de la factura, en la primaria.
   * @param invoiceId Factura a la que debe pertenecer.
   * @param id Id del intento.
   * @returns El intento, o `undefined` si no existe o es de otra factura.
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
   * Lee el intento de número más alto de la factura, en la primaria.
   * @param invoiceId Factura de los intentos.
   * @returns El último intento, o `undefined` si no tiene ninguno.
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
   * Guarda la respuesta solo si el intento sigue abierto: un `UPDATE` condicionado al estado.
   * @param id Id del intento.
   * @param result Respuesta del proveedor.
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
