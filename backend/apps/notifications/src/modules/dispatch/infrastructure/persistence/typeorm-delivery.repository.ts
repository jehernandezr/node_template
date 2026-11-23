import { Injectable } from '@nestjs/common';
import { ManagerIntent, RepositoryKit } from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import type { Delivery } from '../../domain/delivery.js';
import { DeliveryRepository } from '../../domain/delivery.repository.js';
import { DeliveryRowMapper } from './delivery-row.mapper.js';
import { DeliveryEntity } from './entities/delivery.entity.js';

/** `DeliveryRepository` sobre `notification_deliveries` del shard del usuario. */
@Injectable()
export class TypeOrmDeliveryRepository extends DeliveryRepository {
  private static readonly ERROR_MAX = 500;

  constructor(private readonly kit: RepositoryKit) {
    super();
  }

  /** Actualiza la fila o la crea: el `UPDATE` de TypeORM sube `version` y `updated_at`, un upsert no. */
  async save(delivery: Delivery): Promise<void> {
    const { id, ...fields } = {
      id: delivery.id,
      notificationId: delivery.notificationId,
      userId: delivery.userId,
      homeTenantId: delivery.homeTenantId,
      channel: delivery.channel,
      status: delivery.status,
      attempts: delivery.attempts,
      nextAttemptAt: delivery.nextAttemptAt,
      title: delivery.title,
      body: delivery.body,
      locale: delivery.locale,
      providerId: delivery.providerId ?? null,
      error:
        delivery.error?.slice(0, TypeOrmDeliveryRepository.ERROR_MAX) ?? null,
    };
    await this.run(ManagerIntent.Write, async (manager) => {
      const updated = await manager.update(DeliveryEntity, { id }, fields);
      if (updated.affected === 0) {
        await manager.insert(DeliveryEntity, { id, ...fields });
      }
    });
  }

  async ofNotification(notificationId: string): Promise<readonly Delivery[]> {
    const rows = await this.run(ManagerIntent.ReadPrimary, (manager) =>
      manager.findBy(DeliveryEntity, { notificationId }),
    );
    return rows.map((row) => DeliveryRowMapper.toDomain(row));
  }

  async erase(userId: string): Promise<number> {
    const result = await this.run(ManagerIntent.Write, (manager) =>
      manager.delete(DeliveryEntity, { userId }),
    );
    return result.affected ?? 0;
  }

  private run<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.kit.provider.run({ feature: this.kit.feature, intent }, fn);
  }
}
