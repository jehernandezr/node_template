import { FailureKind, PlatformError } from '@platform/kernel';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/**
 * A Valkey command failed. `failureKind` lets the `FailureClassifier` (and
 * thus the resilience breaker) tell a server that is down or in failover
 * (transient) from a malformed command (permanent). The message names the
 * command, never keys or values.
 */
export class ValkeyCommandError extends PlatformError {
  override readonly code = ValkeyErrorCode.CommandFailed;
  declare readonly failureKind: FailureKind;
  /** Command that failed, for example `GET` or `EVALSHA`. */
  readonly command: string;

  constructor(command: string, failureKind: FailureKind, cause: unknown) {
    super(`Valkey command ${command} failed`, {
      failureKind,
      retryable: failureKind === FailureKind.Transient,
      details: { command, failureKind },
      cause,
    });
    this.command = command;
  }
}
