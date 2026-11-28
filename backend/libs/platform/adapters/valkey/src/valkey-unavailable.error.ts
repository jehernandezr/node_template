import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/**
 * Valkey did not answer: the connection failed, the command missed its deadline, the server is loading or in
 * failover, or the circuit is open. It is retryable and answers 503 `PLATFORM.DEPENDENCY.UNAVAILABLE`, so a check
 * that must fail closed refuses the request without blaming the client. The message names the command, never keys
 * or values.
 */
export class ValkeyUnavailableError extends PlatformError {
  override readonly code = PlatformErrorCode.DependencyUnavailable;
  declare readonly failureKind: FailureKind;
  /** Command that did not run, for example `GET` or `EVALSHA`. */
  readonly command: string;

  constructor(command: string, failureKind: FailureKind, cause?: unknown) {
    super(`Valkey is unavailable for ${command}`, {
      failureKind,
      retryable: true,
      details: { command, failureKind },
      cause,
    });
    this.command = command;
  }
}
