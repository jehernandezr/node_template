import type { ResilienceErrorOptions } from './resilience-error.js';
import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** El circuito de la dependencia está abierto; la llamada no se ejecutó. */
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
