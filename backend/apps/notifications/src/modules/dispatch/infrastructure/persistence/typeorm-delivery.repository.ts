import { Injectable } from '@nestjs/common';
import { ManagerIntent, RepositoryKit } from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import type { Delivery } from '../../domain/delivery.js';
import { DeliveryRepository } from '../../domain/delivery.repository.js';
import { DeliveryRowMapper } from './delivery-row.mapper.js';
import { DeliveryEntity } from './entities/delivery.entity.js';

/** `DeliveryRepository` over `notification_deliveries` in the user's shard. */
@Injectable()
export class TypeOrmDeliveryRepository extends DeliveryRepository {
  private static readonly ERROR_MAX = 500;

  constructor(private readonly kit: RepositoryKit) {
    super();
  }

  /**
   * A single `INSERT ... ON CONFLICT` so that two writes of the same delivery do not collide on the key; the
   * conflict bumps `version` and `updated_at` by hand because TypeORM's upsert does not.
   */
  async save(delivery: Delivery): Promise<void> {
    await this.run(ManagerIntent.Write, (manager) =>
      manager.query(
        `INSERT INTO "notification_deliveries" ("id", "notification_id", "user_id", "home_tenant_id", "channel", "status", "attempts", "next_attempt_at", "title", "body", "locale", "provider_id", "error", "version") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1) ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status", "attempts" = EXCLUDED."attempts", "next_attempt_at" = EXCLUDED."next_attempt_at", "title" = EXCLUDED."title", "body" = EXCLUDED."body", "locale" = EXCLUDED."locale", "provider_id" = EXCLUDED."provider_id", "error" = EXCLUDED."error", "version" = "notification_deliveries"."version" + 1, "updated_at" = now()`,
        [
          delivery.id,
          delivery.notificationId,
          delivery.userId,
          delivery.homeTenantId,
          delivery.channel,
          delivery.status,
          delivery.attempts,
          delivery.nextAttemptAt,
          delivery.title,
          delivery.body,
          delivery.locale,
          delivery.providerId ?? null,
          delivery.error?.slice(0, TypeOrmDeliveryRepository.ERROR_MAX) ?? null,
        ],
      ),
    );
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
