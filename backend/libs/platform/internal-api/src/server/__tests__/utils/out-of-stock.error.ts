import { DomainError } from '@platform/kernel';
import { ServerHarness } from './server-harness.js';

/** Business error that the test contract declares as `STOCK.RESERVE.OUT_OF_STOCK`. */
export class OutOfStockError extends DomainError {
  readonly code = ServerHarness.OUT_OF_STOCK;
}
