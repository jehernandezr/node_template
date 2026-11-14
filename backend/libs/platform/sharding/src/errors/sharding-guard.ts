import { Guard } from '@platform/kernel';
import { ShardingError } from './sharding-error.js';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/** Guarda de `@platform/sharding`: toda violación sale como `ShardingError` `InvalidConfiguration`. */
export class ShardingGuard {
  static readonly instance = new Guard(
    (message, violation) =>
      new ShardingError(ShardingErrorCode.InvalidConfiguration, message, {
        details: { option: violation.name },
      }),
  );
}
