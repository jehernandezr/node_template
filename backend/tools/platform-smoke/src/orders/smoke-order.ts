import { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Order aggregate. `version` is 0 while it has not been saved. */
export class SmokeOrder {
  constructor(
    readonly id: string,
    readonly customer: string,
    readonly status: SmokeOrderStatus,
    readonly version: number,
  ) {}

  withStatus(status: SmokeOrderStatus): SmokeOrder {
    return new SmokeOrder(this.id, this.customer, status, this.version);
  }
}
