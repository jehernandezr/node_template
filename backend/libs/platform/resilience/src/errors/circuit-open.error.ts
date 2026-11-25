import type { ResilienceErrorOptions } from './resilience-error.js';
import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** The dependency's circuit is open; the call did not run. */
export class CircuitOpenError extends ResilienceError {
  constructor(
    policy: string,
    dependencyKey: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      ResilienceErrorCode.CircuitOpen,
      `Circuit open for policy "${policy}"`,
      { ...options, details: { policy, dependencyKey } },
    );
  }
}
