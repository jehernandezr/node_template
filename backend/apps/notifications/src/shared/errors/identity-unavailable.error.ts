import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/** Identity no respondió una consulta que la entrega necesita. Es reintentable: el mensaje vuelve a la cola. */
export class IdentityUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}
