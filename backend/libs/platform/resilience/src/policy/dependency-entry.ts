import type { Bulkhead } from '../execution/bulkhead.js';
import type { ConsecutiveCircuitBreaker } from '../execution/consecutive-circuit-breaker.js';

/** Bulkhead y breaker compartidos por todas las llamadas a una dependencia. */
export interface DependencyEntry {
  readonly bulkhead?: Bulkhead;
  readonly breaker?: ConsecutiveCircuitBreaker;
}
