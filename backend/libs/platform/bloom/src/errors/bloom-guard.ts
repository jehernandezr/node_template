import { Guard } from '@platform/kernel';
import { InvalidParametersError } from './invalid-parameters.error.js';

/** Argument validations of `@platform/bloom`. */
export class BloomGuard {
  static readonly instance = new Guard(
    (message) => new InvalidParametersError(message),
  );
}
