import { FailureKind, PlatformError } from '@platform/kernel';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/** The server replied with a shape the adapter does not expect: another server, a missing module or a key of another type. */
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
