import { DomainError } from '@platform/kernel';
import { ServerHarness } from './server-harness.js';

/** Error de negocio que el contrato de las pruebas declara como `STOCK.RESERVE.OUT_OF_STOCK`. */
export class OutOfStockError extends DomainError {
  readonly code = ServerHarness.OUT_OF_STOCK;
}
