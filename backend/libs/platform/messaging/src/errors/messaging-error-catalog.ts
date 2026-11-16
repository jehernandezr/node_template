import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/**
 * Catálogo de los códigos de `@platform/messaging`. Repite el estado HTTP, la
 * audiencia y el texto que hoy tiene el catálogo central, así que ningún código
 * observable cambia.
 */
export const messagingErrorCatalog = defineErrorCatalog(MessagingErrorCode, {
  [MessagingErrorCode.InvalidEnvelope]: ErrorSpecs.internal(
    400,
    false,
    'El sobre del mensaje no cumple el formato CloudEvents esperado.',
  ),
  [MessagingErrorCode.InvalidPayload]: ErrorSpecs.internal(
    400,
    false,
    'El payload del mensaje no cumple su contrato.',
  ),
  [MessagingErrorCode.InvalidRetryPolicy]: ErrorSpecs.internal(
    500,
    false,
    'La política de reintentos del consumidor es inválida.',
  ),
  [MessagingErrorCode.InvalidTopology]: ErrorSpecs.internal(
    500,
    false,
    'La topología de mensajería es inválida.',
  ),
  [MessagingErrorCode.UnknownRoute]: ErrorSpecs.internal(
    500,
    false,
    'No hay ruta configurada para el tipo de mensaje.',
  ),
  [MessagingErrorCode.UnknownQueue]: ErrorSpecs.internal(
    500,
    false,
    'La cola indicada no existe en la topología.',
  ),
  [MessagingErrorCode.DuplicateHandler]: ErrorSpecs.internal(
    500,
    false,
    'Dos manejadores atienden el mismo tipo de mensaje en la misma cola.',
  ),
  [MessagingErrorCode.PermanentError]: ErrorSpecs.internal(
    500,
    false,
    'El manejador falló de forma permanente; el mensaje va a la cola de errores.',
  ),
  [MessagingErrorCode.PayloadTooLarge]: ErrorSpecs.internal(
    413,
    false,
    'El mensaje supera el tamaño máximo permitido.',
  ),
  [MessagingErrorCode.TenantMismatch]: ErrorSpecs.internal(
    403,
    false,
    'El tenant del mensaje no coincide con el esperado.',
  ),
  [MessagingErrorCode.IdempotencyConflict]: ErrorSpecs.internal(
    409,
    false,
    'Se reutilizó el id de un mensaje con otro contenido.',
  ),
  [MessagingErrorCode.InvalidOptions]: ErrorSpecs.internal(
    500,
    false,
    'Las opciones de mensajería no son válidas.',
  ),
  [MessagingErrorCode.TransactionRequired]: ErrorSpecs.internal(
    500,
    false,
    'El outbox exige una transacción abierta para guardar el mensaje.',
  ),
  [MessagingErrorCode.TransportFailed]: ErrorSpecs.internal(
    503,
    true,
    'El transporte de mensajería (SNS o SQS) no respondió o rechazó la llamada.',
  ),
});
