import type { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Forma en la que el caché guarda un pedido: datos planos, sin clases, para que sobreviva el JSON. */
export interface SmokeOrderView {
  readonly id: string;
  readonly customer: string;
  readonly status: SmokeOrderStatus;
}
