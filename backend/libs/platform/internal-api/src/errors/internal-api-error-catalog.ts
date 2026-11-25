import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { InternalApiErrorCode } from './internal-api-error-code.enum.js';

/** Catálogo de los códigos de `@platform/internal-api`; ninguno llega al cliente. */
export const internalApiErrorCatalog = defineErrorCatalog(
  InternalApiErrorCode,
  {
    [InternalApiErrorCode.InvalidOutput]: ErrorSpecs.internal(
      502,
      false,
      'La salida de una operación interna no cumple su contrato.',
    ),
    [InternalApiErrorCode.UnknownOperation]: ErrorSpecs.internal(
      404,
      false,
      'La operación interna no está registrada.',
    ),
    [InternalApiErrorCode.DuplicateOperation]: ErrorSpecs.internal(
      500,
      false,
      'Dos operaciones internas usan el mismo identificador.',
    ),
    [InternalApiErrorCode.MissingCompensation]: ErrorSpecs.internal(
      500,
      false,
      'Una operación que modifica datos no declara su compensación.',
    ),
    [InternalApiErrorCode.MissingHandler]: ErrorSpecs.internal(
      500,
      false,
      'La operación interna no tiene manejador.',
    ),
    [InternalApiErrorCode.NonJsonSafeSchema]: ErrorSpecs.internal(
      500,
      false,
      'El esquema de la operación interna no se puede serializar a JSON.',
    ),
    [InternalApiErrorCode.InvalidOperation]: ErrorSpecs.internal(
      500,
      false,
      'El valor recibido no es una operación declarada con defineOperation.',
    ),
    [InternalApiErrorCode.InvalidIdempotencyKey]: ErrorSpecs.internal(
      400,
      false,
      'La llave de idempotencia o el tenant de la llamada interna falta o supera la longitud máxima.',
    ),
    [InternalApiErrorCode.StepCompensated]: ErrorSpecs.internal(
      409,
      false,
      'La compensación de este paso de saga ya corrió: el paso no se aplica.',
    ),
    [InternalApiErrorCode.IdempotencyKeyReuse]: ErrorSpecs.internal(
      409,
      false,
      'La llave de idempotencia de la operación interna ya se usó con otra entrada.',
    ),
    [InternalApiErrorCode.PayloadTooLarge]: ErrorSpecs.internal(
      413,
      false,
      'La entrada o la salida de la operación interna supera el tamaño máximo.',
    ),
    [InternalApiErrorCode.InvalidHandlerResult]: ErrorSpecs.internal(
      500,
      false,
      'El manejador de la operación interna devolvió un resultado que no es un CallOutcome.',
    ),
    [InternalApiErrorCode.CallBudgetExceeded]: ErrorSpecs.internal(
      500,
      false,
      'Una operación interna puede tardar más que el presupuesto de una llamada, reintentos incluidos.',
    ),
    [InternalApiErrorCode.Unauthenticated]: ErrorSpecs.internal(
      401,
      false,
      'La llamada interna no trae una firma válida dentro de la ventana de tiempo.',
    ),
    [InternalApiErrorCode.InvalidRequest]: ErrorSpecs.internal(
      400,
      false,
      'La llamada interna no tiene la forma que exige el protocolo.',
    ),
    [InternalApiErrorCode.InvalidConfiguration]: ErrorSpecs.internal(
      500,
      false,
      'La configuración del transporte o de la firma de la API interna no es válida.',
    ),
    [InternalApiErrorCode.UnknownService]: ErrorSpecs.internal(
      500,
      false,
      'No hay una URL base configurada para el servicio dueño de la operación.',
    ),
  },
);
