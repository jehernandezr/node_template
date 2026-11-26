import type { Delivery } from './delivery.js';

/** Deliveries of the notifications of the user of the open `ShardScope`. */
export abstract class DeliveryRepository {
  /**
   * Saves or replaces the delivery by its id.
   * @param delivery Delivery to store.
   */
  abstract save(delivery: Delivery): Promise<void>;

  /**
   * Reads the deliveries of a notification.
   * @param notificationId Notification to read.
   * @returns Its deliveries, one per channel.
   */
  abstract ofNotification(notificationId: string): Promise<readonly Delivery[]>;

  /**
   * Deletes every delivery of a user.
   * @param userId User to erase.
   * @returns How many were deleted.
   */
  abstract erase(userId: string): Promise<number>;
}
