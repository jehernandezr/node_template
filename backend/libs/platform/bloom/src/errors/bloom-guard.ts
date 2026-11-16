import { Guard } from '@platform/kernel';
import { InvalidParametersError } from './invalid-parameters.error.js';

/** Validaciones de argumentos de `@platform/bloom`. */
export class BloomGuard {
  static readonly instance = new Guard(
    (message) => new InvalidParametersError(message),
  );
}
