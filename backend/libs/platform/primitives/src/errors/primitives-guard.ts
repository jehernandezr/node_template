import { Guard } from '@platform/kernel';
import { InvalidArgumentError } from './invalid-argument.error.js';

/** Guarda de `@platform/primitives`: toda violación sale como `InvalidArgumentError`. */
export class PrimitivesGuard {
  static readonly instance = new Guard(
    (_message, violation) =>
      new InvalidArgumentError(violation.name, violation.expectation),
  );
}
