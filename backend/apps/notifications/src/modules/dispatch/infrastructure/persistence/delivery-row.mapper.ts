import type { NotificationChannel } from '@contracts/notifications';
import type { Delivery, DeliveryStatus } from '../../domain/delivery.js';
import type { DeliveryEntity } from './entities/delivery.entity.js';

/** Maps a `notification_deliveries` row to a `Delivery`. Pure utility. */
export class DeliveryRowMapper {
  /**
   * Rebuilds a delivery from its row.
   * @param row Stored row.
   * @returns The domain delivery.
   */
  static toDomain(row: DeliveryEntity): Delivery {
    return {
      id: row.id,
      notificationId: row.notificationId,
      userId: row.userId,
      homeTenantId: row.homeTenantId,
      channel: row.channel as NotificationChannel,
      status: row.status as DeliveryStatus,
      attempts: row.attempts,
      nextAttemptAt: row.nextAttemptAt,
      title: row.title,
      body: row.body,
      locale: row.locale,
      ...(row.providerId === null ? {} : { providerId: row.providerId }),
      ...(row.error === null ? {} : { error: row.error }),
    };
  }
}
