import { Guard } from '@platform/kernel';
import { InvalidArgumentError } from '@platform/primitives';

/** Argument validations of `@platform/rate-limit`: every violation comes out as `InvalidArgumentError`. */
export class RateLimitArgumentGuard {
  static readonly instance = new Guard(
    (_message, violation) =>
      new InvalidArgumentError(violation.name, violation.expectation),
  );
}
