import type { ResilienceErrorOptions } from './resilience-error.js';
import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** The dependency's bulkhead has no free slot or room in the queue; the call did not run. */
export class BulkheadFullError extends ResilienceError {
  constructor(
    policy: string,
    dependencyKey: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      ResilienceErrorCode.BulkheadFull,
      `Bulkhead full for policy "${policy}"`,
      { ...options, details: { policy, dependencyKey } },
    );
  }
}
