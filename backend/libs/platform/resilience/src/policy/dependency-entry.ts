import type { Bulkhead } from '../execution/bulkhead.js';
import type { ConsecutiveCircuitBreaker } from '../execution/consecutive-circuit-breaker.js';

/** Bulkhead and breaker shared by all calls to a dependency. */
export interface DependencyEntry {
  readonly bulkhead?: Bulkhead;
  readonly breaker?: ConsecutiveCircuitBreaker;
}
