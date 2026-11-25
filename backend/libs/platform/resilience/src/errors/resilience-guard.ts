import { Guard } from '@platform/kernel';
import { InvalidPolicyError } from './invalid-policy.error.js';

/** Guard of `@platform/resilience`: every violation comes out as `InvalidPolicyError`. */
export class ResilienceGuard {
  static readonly instance = new Guard(
    (message) => new InvalidPolicyError(message),
  );
}
