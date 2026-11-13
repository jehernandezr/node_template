import { MessagingError, MessagingErrorCode } from '@platform/messaging';

/** Operación del SDK que falló, para el mensaje del error. */
export enum AwsOperation {
  Publish = 'sns:Publish',
  SendMessage = 'sqs:SendMessage',
  GetQueueUrl = 'sqs:GetQueueUrl',
  ReceiveMessage = 'sqs:ReceiveMessage',
  DeleteMessageBatch = 'sqs:DeleteMessageBatch',
  ChangeMessageVisibility = 'sqs:ChangeMessageVisibility',
}

interface SdkErrorShape {
  readonly name?: unknown;
  readonly $fault?: unknown;
  readonly $retryable?: unknown;
}

/**
 * Si reintentar puede servir: fallas del servidor, throttling y errores de red
 * (sin `$fault`). Un error de cliente (permiso, recurso inexistente, parámetro
 * inválido) no cambia al repetir.
 */
export function isRetryableAwsError(error: unknown): boolean {
  const shape = (error ?? {}) as SdkErrorShape;
  if (shape.$retryable !== undefined && shape.$retryable !== null) return true;
  return shape.$fault !== 'client';
}

/**
 * Convierte un error del SDK en `PLATFORM.MESSAGING.TRANSPORT_FAILED`. El
 * mensaje lleva la operación y el nombre del error, nunca el cuerpo enviado.
 */
export function transportError(
  operation: AwsOperation,
  error: unknown,
  target?: string,
): MessagingError {
  if (error instanceof MessagingError) return error;
  const name =
    typeof (error as SdkErrorShape | null)?.name === 'string'
      ? String((error as SdkErrorShape).name)
      : 'Error';
  return new MessagingError(
    MessagingErrorCode.TransportFailed,
    `${operation}${target === undefined ? '' : ` (${target})`} failed: ${name}`,
    { retryable: isRetryableAwsError(error), cause: error },
  );
}
