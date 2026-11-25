import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { SagaErrorCode } from './saga-error-code.enum.js';

/**
 * Catalog of the `@platform/saga` codes. The codes are internal: the
 * central catalog does not declare them.
 */
export const sagaErrorCatalog = defineErrorCatalog(SagaErrorCode, {
  [SagaErrorCode.NotFound]: ErrorSpecs.internal(
    404,
    false,
    'La saga no existe.',
  ),
  [SagaErrorCode.DuplicateSaga]: ErrorSpecs.internal(
    409,
    false,
    'Ya existe una saga con ese identificador.',
  ),
  [SagaErrorCode.UnknownDefinition]: ErrorSpecs.internal(
    500,
    false,
    'La definición de saga no está registrada.',
  ),
  [SagaErrorCode.InvalidDefinition]: ErrorSpecs.internal(
    500,
    false,
    'La definición de saga es inválida.',
  ),
  [SagaErrorCode.InvalidConfiguration]: ErrorSpecs.internal(
    500,
    false,
    'La configuración del orquestador de sagas es inválida.',
  ),
  [SagaErrorCode.InvalidState]: ErrorSpecs.internal(
    409,
    false,
    'La saga no está en un estado que permita la acción.',
  ),
  [SagaErrorCode.MissingCompensation]: ErrorSpecs.internal(
    500,
    false,
    'Un paso de la saga modifica datos y no declara compensación.',
  ),
  [SagaErrorCode.ConcurrentModification]: ErrorSpecs.internal(
    409,
    true,
    'Otro proceso modificó la saga al mismo tiempo.',
  ),
  [SagaErrorCode.LeaseNotAcquired]: ErrorSpecs.internal(
    409,
    true,
    'Otro proceso tiene el turno de la saga.',
  ),
  [SagaErrorCode.LeaseLost]: ErrorSpecs.internal(
    409,
    true,
    'El proceso perdió el turno de la saga durante la ejecución.',
  ),
  [SagaErrorCode.TransientFailure]: ErrorSpecs.internal(
    503,
    true,
    'Un paso de la saga falló de forma transitoria.',
  ),
  [SagaErrorCode.ProtocolViolation]: ErrorSpecs.internal(
    500,
    false,
    'Un paso de la saga devolvió una respuesta fuera de su contrato.',
  ),
  [SagaErrorCode.UncertainOutcome]: ErrorSpecs.internal(
    504,
    true,
    'No se sabe si un paso de la saga se aplicó; se reintenta con la misma llave.',
  ),
  [SagaErrorCode.StateUpdateFailed]: ErrorSpecs.internal(
    500,
    true,
    'No se pudo guardar el estado de la saga.',
  ),
  [SagaErrorCode.InputBuildFailed]: ErrorSpecs.internal(
    500,
    false,
    'No se pudo construir la entrada de un paso de la saga.',
  ),
  [SagaErrorCode.IdempotencyKeyConflict]: ErrorSpecs.internal(
    409,
    false,
    'La clave de idempotencia ya se usó con otra entrada.',
  ),
  [SagaErrorCode.DeadlineExceeded]: ErrorSpecs.internal(
    504,
    false,
    'La saga superó su plazo máximo.',
  ),
});
