import { Guard } from '@platform/kernel';
import { InvalidArgumentError } from './invalid-argument.error.js';

/** Guard of `@platform/primitives`: every violation comes out as `InvalidArgumentError`. */
export class PrimitivesGuard {
  static readonly instance = new Guard(
    (_message, violation) =>
      new InvalidArgumentError(violation.name, violation.expectation),
  );
}
