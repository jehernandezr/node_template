import { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Agregado de pedido. `version` es 0 mientras no se ha guardado. */
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
