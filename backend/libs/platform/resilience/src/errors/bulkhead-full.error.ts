import type { ResilienceErrorOptions } from './resilience-error.js';
import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** El bulkhead de la dependencia no tiene cupo ni lugar en la cola; la llamada no se ejecutó. */
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
