import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import {
  EmailLedger,
  type EmailRecord,
  type EmailStatus,
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
    return row === null
      ? undefined
      : {
          messageId: row.messageId,
          template: row.template,
          templateVersion: row.templateVersion,
          recipientHash: row.recipientHash,
          status: row.status as EmailStatus,
          ...(row.providerId === null ? {} : { providerId: row.providerId }),
          ...(row.traceId === null ? {} : { traceId: row.traceId }),
        };
  }

  /** Actualiza la fila o la crea: el `UPDATE` de TypeORM sube `version` y `updated_at`, un upsert no. */
  async record(entry: EmailRecord): Promise<void> {
    const { messageId } = entry;
    const fields = {
      template: entry.template,
      templateVersion: entry.templateVersion,
      recipientHash: entry.recipientHash,
      status: entry.status,
      providerId: entry.providerId ?? null,
      traceId: entry.traceId ?? null,
    };
    await this.run(async (manager) => {
      const updated = await manager.update(
        EmailMessageEntity,
        { messageId },
        fields,
      );
      if (updated.affected === 0) {
        await manager.insert(EmailMessageEntity, { messageId, ...fields });
      }
    });
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
