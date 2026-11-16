import { Guard } from '@platform/kernel';
import { CacheInvalidArgumentError } from './cache-invalid-argument.error.js';

/** Validaciones de argumentos de `@platform/cache`. */
export class CacheGuard {
  static readonly instance = new Guard(
    (_message, violation) =>
      new CacheInvalidArgumentError(violation.name, violation.expectation),
  );
}
