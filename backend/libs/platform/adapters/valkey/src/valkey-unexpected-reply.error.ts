import { FailureKind, PlatformError } from '@platform/kernel';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/** El servidor respondió con una forma que el adaptador no espera: otro servidor, un módulo ausente o una llave de otro tipo. */
export class ValkeyUnexpectedReplyError extends PlatformError {
  override readonly code = ValkeyErrorCode.UnexpectedReply;
  declare readonly failureKind: FailureKind;

  constructor(command: string, expected: string) {
    super(`Valkey command ${command} returned an unexpected reply`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { command, expected },
    });
  }
}
