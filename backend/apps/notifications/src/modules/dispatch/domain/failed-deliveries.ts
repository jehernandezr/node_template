import type { Delivery } from './delivery.js';

/** Las entregas pendientes o fallidas de todos los shards. */
export abstract class FailedDeliveries {
  /** Las que ya pueden reintentarse en `now`, las más atrasadas primero, hasta `limit`. */
  abstract due(now: Date, limit: number): Promise<readonly Delivery[]>;
}
