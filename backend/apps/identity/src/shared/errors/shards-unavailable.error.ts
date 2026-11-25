import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/** A change that must reach every shard did not reach some of them. It is retryable: repeating it finishes it. */
export class ShardsUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operation: string, shards: readonly string[]) {
    super(`${operation} did not reach the shards ${shards.join(', ')}`, {
      retryable: true,
    });
  }
}
