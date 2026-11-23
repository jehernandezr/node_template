import type { Subscription } from './subscription.js';

/** La suscripción del tenant del `ShardScope` abierto. Hay a lo sumo una por tenant. */
export abstract class SubscriptionRepository {
  abstract find(): Promise<Subscription | undefined>;
  abstract insert(subscription: Subscription): Promise<void>;
  /** @throws OptimisticLockError si otra escritura la cambió desde que se leyó. */
  abstract update(subscription: Subscription): Promise<void>;
  /** Devuelve `false` si no había suscripción. */
  abstract remove(): Promise<boolean>;
}
