import type { Delivery } from './delivery.js';

/** Entregas de las notificaciones del usuario del `ShardScope` abierto. */
export abstract class DeliveryRepository {
  /** Guarda o reemplaza la entrega por su id. */
  abstract save(delivery: Delivery): Promise<void>;

  abstract ofNotification(notificationId: string): Promise<readonly Delivery[]>;

  abstract erase(userId: string): Promise<number>;
}
