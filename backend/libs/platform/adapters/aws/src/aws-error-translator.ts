import { FailureKind } from '@platform/kernel';
import { MessagingError, MessagingErrorCode } from '@platform/messaging';
import { FailureRule } from '@platform/primitives';
import type { AwsOperation } from './aws-operation.enum.js';

/** Forma de un error del SDK de AWS que el traductor sabe leer. */
interface SdkErrorShape {
  readonly name?: unknown;
  readonly $fault?: unknown;
  readonly $retryable?: unknown;
  readonly $metadata?: unknown;
}

/**
 * Traduce los errores del SDK de AWS. Como `FailureRule` le dice al
 * `FailureClassifier` si un error del SDK es pasajero o permanente; como
 * traductor convierte el error de una operación en
 * `PLATFORM.MESSAGING.TRANSPORT_FAILED`, con la operación y el nombre del
 * error en el mensaje y nunca el cuerpo enviado.
 */
export class AwsErrorTranslator extends FailureRule {
  /** Pasajero o permanente para un error del SDK; `undefined` para cualquier otro. */
  classify(error: object): FailureKind | undefined {
    if (!AwsErrorTranslator.isSdkError(error)) {
      return undefined;
    }
    return this.isRetryable(error)
      ? FailureKind.Transient
      : FailureKind.Permanent;
  }

  /**
   * Si reintentar puede servir: fallas del servidor, throttling y errores de
   * red (sin `$fault`). Un error de cliente (permiso, recurso inexistente,
   * parámetro inválido) no cambia al repetir.
   */
  isRetryable(error: unknown): boolean {
    const shape = (error ?? {}) as SdkErrorShape;
    if (shape.$retryable !== undefined && shape.$retryable !== null) {
      return true;
    }
    return shape.$fault !== 'client';
  }

  /** Un `MessagingError` ya traducido pasa sin cambios. */
  translate(
    operation: AwsOperation,
    error: unknown,
    target?: string,
  ): MessagingError {
    if (error instanceof MessagingError) {
      return error;
    }
    const name =
      typeof (error as SdkErrorShape | null)?.name === 'string'
        ? String((error as SdkErrorShape).name)
        : 'Error';
    return new MessagingError(
      MessagingErrorCode.TransportFailed,
      `${operation}${target === undefined ? '' : ` (${target})`} failed: ${name}`,
      { retryable: this.isRetryable(error), cause: error },
    );
  }

  private static isSdkError(error: object): boolean {
    const shape = error as SdkErrorShape;
    return (
      shape.$fault !== undefined ||
      shape.$retryable !== undefined ||
      shape.$metadata !== undefined
    );
  }
}
