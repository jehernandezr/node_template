import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** There is no policy registered with that name. */
export class UnknownPolicyError extends ResilienceError {
  constructor(policy: string) {
    super(
      ResilienceErrorCode.UnknownPolicy,
      `Unknown resilience policy "${policy}"`,
      { details: { policy } },
    );
  }
}
