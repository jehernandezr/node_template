import { Guard } from '@platform/kernel';
import { InvalidArgumentError } from '@platform/primitives';

/** Validaciones de argumentos de `@platform/rate-limit`: toda violación sale como `InvalidArgumentError`. */
export class RateLimitArgumentGuard {
  static readonly instance = new Guard(
    (_message, violation) =>
      new InvalidArgumentError(violation.name, violation.expectation),
  );
}
