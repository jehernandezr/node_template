import type { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Shape in which the cache stores an order: plain data, without classes, so it survives JSON. */
export interface SmokeOrderView {
  readonly id: string;
  readonly customer: string;
  readonly status: SmokeOrderStatus;
}
