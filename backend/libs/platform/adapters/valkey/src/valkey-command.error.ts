import { FailureKind, PlatformError } from '@platform/kernel';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/**
 * Falló un comando de Valkey. `failureKind` deja que el `FailureClassifier` (y
 * así el breaker de resilience) distinga un servidor caído o en failover
 * (pasajero) de un comando mal armado (permanente). El mensaje nombra el
 * comando, nunca llaves ni valores.
 */
export class ValkeyCommandError extends PlatformError {
  override readonly code = ValkeyErrorCode.CommandFailed;
  declare readonly failureKind: FailureKind;
  /** Comando que falló, por ejemplo `GET` o `EVALSHA`. */
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
