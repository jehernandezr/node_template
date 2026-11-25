import { Injectable } from '@nestjs/common';
import {
  CatalogDataSource,
  PersistenceError,
  PersistenceErrorCode,
} from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import {
  EmailLedger,
  EmailReservationKind,
  EmailStatus,
  type EmailRecord,
  type EmailReservation,
} from '../../domain/email-ledger.js';
import { EmailMessageEntity } from './entities/email-message.entity.js';
import { EmailSuppressionEntity } from './entities/email-suppression.entity.js';

/** `EmailLedger` sobre `email_messages` y `email_suppressions` del catálogo, siempre en el primario. */
@Injectable()
export class TypeOrmEmailLedger extends EmailLedger {
  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  async find(messageId: string): Promise<EmailRecord | undefined> {
    const row = await this.run((manager) =>
      manager.findOneBy(EmailMessageEntity, { messageId }),
    );
    return row === null ? undefined : TypeOrmEmailLedger.toRecord(row);
  }

  /**
   * Reserva con un `INSERT ... ON CONFLICT DO UPDATE ... WHERE`: Postgres toma la fila con su candado, así de dos
   * reservas simultáneas solo una devuelve la fila. El plazo de abandono se mide con el reloj de la base, el mismo que
   * escribe `updated_at`.
   * @param entry Correo a reservar.
   * @param abandonedAfterMs Milisegundos tras los que una reserva en `Sending` se da por abandonada.
   * @returns `Reserved` si este envío es el dueño, o `Taken` con el registro vigente.
   * @throws PersistenceError `PLATFORM.PERSISTENCE.CONTENTION` si la fila desaparece entre la reserva y su lectura.
   */
  async reserve(
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
    abandonedAfterMs: number,
  ): Promise<EmailReservation> {
    const reserved: unknown[] = await this.run((manager) =>
      manager.query(
        `INSERT INTO "email_messages" ("message_id", "template", "template_version", "recipient_hash", "status", "provider_id", "trace_id", "version") VALUES ($1, $2, $3, $4, $5, NULL, $6, 1) ON CONFLICT ("message_id") DO UPDATE SET "template" = EXCLUDED."template", "template_version" = EXCLUDED."template_version", "recipient_hash" = EXCLUDED."recipient_hash", "status" = EXCLUDED."status", "provider_id" = NULL, "trace_id" = EXCLUDED."trace_id", "version" = "email_messages"."version" + 1, "updated_at" = now() WHERE "email_messages"."status" = $7 OR ("email_messages"."status" = $5 AND "email_messages"."updated_at" < now() - make_interval(secs => $8::double precision / 1000)) RETURNING "message_id"`,
        [
          entry.messageId,
          entry.template,
          entry.templateVersion,
          entry.recipientHash,
          EmailStatus.Sending,
          entry.traceId ?? null,
          EmailStatus.Failed,
          abandonedAfterMs,
        ],
      ),
    );
    if (reserved.length > 0) {
      return { kind: EmailReservationKind.Reserved };
    }
    const current = await this.find(entry.messageId);
    if (current === undefined) {
      throw new PersistenceError(
        PersistenceErrorCode.Contention,
        'email reservation lost its row',
        { details: { messageId: entry.messageId } },
      );
    }
    return { kind: EmailReservationKind.Taken, current };
  }

  /**
   * Un solo `INSERT ... ON CONFLICT` para que dos escrituras del mismo mensaje no choquen por llave; el
   * conflicto sube `version` y `updated_at` a mano porque el upsert de TypeORM no lo hace.
   */
  async record(entry: EmailRecord): Promise<void> {
    await this.run((manager) =>
      manager.query(
        `INSERT INTO "email_messages" ("message_id", "template", "template_version", "recipient_hash", "status", "provider_id", "trace_id", "version") VALUES ($1, $2, $3, $4, $5, $6, $7, 1) ON CONFLICT ("message_id") DO UPDATE SET "template" = EXCLUDED."template", "template_version" = EXCLUDED."template_version", "recipient_hash" = EXCLUDED."recipient_hash", "status" = EXCLUDED."status", "provider_id" = EXCLUDED."provider_id", "trace_id" = EXCLUDED."trace_id", "version" = "email_messages"."version" + 1, "updated_at" = now()`,
        [
          entry.messageId,
          entry.template,
          entry.templateVersion,
          entry.recipientHash,
          entry.status,
          entry.providerId ?? null,
          entry.traceId ?? null,
        ],
      ),
    );
  }

  async isSuppressed(recipientHash: string): Promise<boolean> {
    return this.run((manager) =>
      manager.existsBy(EmailSuppressionEntity, { recipientHash }),
    );
  }

  async suppress(recipientHash: string, reason: string): Promise<void> {
    await this.run((manager) =>
      manager.upsert(EmailSuppressionEntity, { recipientHash, reason }, [
        'recipientHash',
      ]),
    );
  }

  private static toRecord(row: EmailMessageEntity): EmailRecord {
    return {
      messageId: row.messageId,
      template: row.template,
      templateVersion: row.templateVersion,
      recipientHash: row.recipientHash,
      status: row.status as EmailStatus,
      ...(row.providerId === null ? {} : { providerId: row.providerId }),
      ...(row.traceId === null ? {} : { traceId: row.traceId }),
    };
  }

  private async run<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    const dataSource = await this.catalog.get();
    const runner = dataSource.createQueryRunner('master');
    try {
      return await fn(runner.manager);
    } finally {
      await runner.release();
    }
  }
}
