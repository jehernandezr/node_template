import { Guard } from '@platform/kernel';
import { InvalidPolicyError } from './invalid-policy.error.js';

/** Guarda de `@platform/resilience`: toda violación sale como `InvalidPolicyError`. */
export class ResilienceGuard {
  static readonly instance = new Guard(
    (message) => new InvalidPolicyError(message),
  );
}
