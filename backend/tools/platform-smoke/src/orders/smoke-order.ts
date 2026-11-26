import { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Order aggregate. `version` is 0 while it has not been saved. */
export class SmokeOrder {
  constructor(
    readonly id: string,
    readonly customer: string,
    readonly status: SmokeOrderStatus,
    readonly version: number,
  ) {}

  /**
   * Copies the order with another status.
   * @param status New status.
   * @returns The changed order.
   */
  withStatus(status: SmokeOrderStatus): SmokeOrder {
    return new SmokeOrder(this.id, this.customer, status, this.version);
  }
}
