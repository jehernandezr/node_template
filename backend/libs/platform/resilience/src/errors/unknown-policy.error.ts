import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** No hay ninguna política registrada con ese nombre. */
export class UnknownPolicyError extends ResilienceError {
  constructor(policy: string) {
    super(
      ResilienceErrorCode.UnknownPolicy,
      `Unknown resilience policy "${policy}"`,
      { details: { policy } },
    );
  }
}
