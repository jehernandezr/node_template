import { PlatformErrorCode as C } from '../enums/platform-error-code.enum.js';
import { defineErrorCatalog, ErrorSpecs } from '../kit/error-catalog.js';

const pub = ErrorSpecs.pub;

/**
 * Catálogo de los códigos públicos y transversales de la plataforma. Cada uno
 * tiene mensaje en el ARB del front con la clave `messageKey`. Los códigos
 * internos de cada librería viven en el catálogo de esa librería, y el servicio
 * compone todos.
 */
export const platformErrorCatalog = defineErrorCatalog(C, {
  [C.ValidationInvalidInput]: pub(
    400,
    false,
    'La entrada no cumple el formato o las reglas esperadas.',
  ),
  [C.ValidationRequired]: pub(400, false, 'Falta un campo obligatorio.'),
  [C.ValidationInvalidType]: pub(
    400,
    false,
    'Un campo tiene un tipo de dato distinto al esperado.',
  ),
  [C.ValidationInvalidFormat]: pub(
    400,
    false,
    'Un campo no cumple el formato esperado, como email, UUID o patrón.',
  ),
  [C.ValidationInvalidEnum]: pub(
    400,
    false,
    'Un campo tiene un valor que no está entre los permitidos.',
  ),
  [C.ValidationTooShort]: pub(
    400,
    false,
    'Un texto o una lista tiene menos elementos de los permitidos.',
  ),
  [C.ValidationTooLong]: pub(
    400,
    false,
    'Un texto o una lista tiene más elementos de los permitidos.',
  ),
  [C.ValidationTooSmall]: pub(
    400,
    false,
    'Un número es menor que el mínimo permitido.',
  ),
  [C.ValidationTooLarge]: pub(
    400,
    false,
    'Un número es mayor que el máximo permitido.',
  ),
  [C.ValidationUnknownField]: pub(
    400,
    false,
    'La petición incluye un campo que el contrato no define.',
  ),
  [C.InternalUnexpected]: pub(
    500,
    false,
    'Ocurrió un error inesperado en el servidor.',
  ),
  [C.AuthUnauthenticated]: pub(
    401,
    false,
    'La solicitud no incluye credenciales válidas.',
  ),
  [C.AuthForbidden]: pub(
    403,
    false,
    'No tienes permiso para realizar esta acción.',
  ),
  [C.AuthTokenExpired]: pub(
    401,
    true,
    'El access token venció. El cliente refresca la sesión y reintenta.',
  ),
  [C.AuthOriginRejected]: pub(
    403,
    false,
    'El origen de la solicitud no está permitido.',
  ),
  [C.RateLimitExceeded]: pub(
    429,
    true,
    'Se superó el límite de solicitudes. Intenta de nuevo más tarde.',
  ),
  [C.ApiVersionSunset]: pub(
    410,
    false,
    'Esta versión de la API ya no está disponible.',
  ),
  [C.ApiUnsupportedVersion]: pub(
    400,
    false,
    'La versión de la API pedida no es compatible.',
  ),
  [C.HttpPayloadTooLarge]: pub(
    413,
    false,
    'El cuerpo de la solicitud supera el tamaño permitido.',
  ),
  [C.HttpUnsupportedMediaType]: pub(
    415,
    false,
    'El tipo de contenido de la solicitud no es compatible.',
  ),
  [C.HttpMalformedBody]: pub(
    400,
    false,
    'El cuerpo de la solicitud no es un JSON válido.',
  ),
  [C.AccessFeatureNotIncluded]: pub(
    403,
    false,
    'El plan del tenant no incluye la funcionalidad que pide la operación.',
  ),
  [C.AccessFlagDisabled]: pub(
    404,
    false,
    'El flag que habilita la ruta está apagado: se comporta como una ruta inexistente.',
  ),
  [C.ResourceNotFound]: pub(404, false, 'El recurso solicitado no existe.'),
  [C.ConflictVersionMismatch]: pub(
    409,
    false,
    'El recurso cambió desde la última lectura. Vuelve a cargarlo.',
  ),
  [C.KernelInvalidId]: pub(
    400,
    false,
    'El identificador no tiene un formato válido.',
  ),
  [C.ShardingKeyMissing]: pub(
    400,
    false,
    'Falta la clave de fragmentación del tenant en la solicitud.',
  ),
  [C.ShardingCrossShardTx]: pub(
    409,
    false,
    'La transacción involucra datos de más de un fragmento.',
  ),
  [C.ShardingTenantMigrating]: pub(
    503,
    true,
    'El tenant se está migrando. Intenta de nuevo en unos instantes.',
  ),
  [C.ShardingTenantNotWritable]: pub(
    503,
    true,
    'El tenant está en solo lectura por mantenimiento. Intenta más tarde.',
  ),
  [C.CriteriaUnknownField]: pub(
    400,
    false,
    'La consulta filtra u ordena por un campo que no existe.',
  ),
  [C.CriteriaInvalidValue]: pub(
    400,
    false,
    'La consulta tiene un valor o un cursor inválido.',
  ),
  [C.CriteriaInvalidLimit]: pub(
    400,
    false,
    'El tamaño de página está fuera del rango permitido.',
  ),
  [C.ResilienceCircuitOpen]: pub(
    503,
    true,
    'Un servicio del que depende la operación no está disponible por ahora.',
  ),
  [C.ResilienceTimeout]: pub(
    504,
    true,
    'La operación tardó más de lo permitido.',
  ),
  [C.ResilienceBulkheadFull]: pub(
    503,
    true,
    'Hay demasiadas operaciones en curso. Intenta de nuevo en unos instantes.',
  ),
  [C.ResilienceOverloaded]: pub(
    503,
    true,
    'El servicio está sobrecargado. Intenta de nuevo en unos instantes.',
  ),
});
