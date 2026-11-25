import type { Delivery } from './delivery.js';

/** Deliveries of the notifications of the user of the open `ShardScope`. */
export abstract class DeliveryRepository {
  /** Saves or replaces the delivery by its id. */
  abstract save(delivery: Delivery): Promise<void>;

  abstract ofNotification(notificationId: string): Promise<readonly Delivery[]>;

  abstract erase(userId: string): Promise<number>;
}
