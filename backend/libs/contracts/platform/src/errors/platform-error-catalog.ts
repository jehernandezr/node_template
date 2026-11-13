import { ErrorAudience } from '../enums/error-audience.enum.js';
import { PlatformErrorCode as C } from '../enums/platform-error-code.enum.js';
import { defineErrorCatalog, type ErrorSpec } from '../kit/error-catalog.js';

const pub = (
  httpStatus: number,
  retryable: boolean,
  description: string,
): ErrorSpec => ({
  httpStatus,
  retryable,
  audience: ErrorAudience.Public,
  description,
});

const internal = (
  httpStatus: number,
  retryable: boolean,
  description: string,
): ErrorSpec => ({
  httpStatus,
  retryable,
  audience: ErrorAudience.Internal,
  description,
});

/**
 * Catálogo de los códigos de plataforma. Los públicos tienen mensaje en el ARB
 * del front con la clave `messageKey`; los internos nunca llegan al cliente.
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
  [C.ShardingUnknownTenant]: internal(
    500,
    false,
    'El tenant no está en el directorio de fragmentos.',
  ),
  [C.ShardingUnknownShard]: internal(
    500,
    false,
    'El fragmento indicado no existe en la configuración.',
  ),
  [C.ShardingWrongRegion]: internal(
    500,
    false,
    'El tenant pertenece a otra región; la petición debió enrutarse allá.',
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
  [C.InternalApiInvalidInput]: internal(
    400,
    false,
    'La entrada de una operación interna no cumple su contrato.',
  ),
  [C.InternalApiInvalidOutput]: internal(
    502,
    false,
    'La salida de una operación interna no cumple su contrato.',
  ),
  [C.InternalApiUnknownOperation]: internal(
    404,
    false,
    'La operación interna no está registrada.',
  ),
  [C.InternalApiDuplicateOperation]: internal(
    500,
    false,
    'Dos operaciones internas usan el mismo identificador.',
  ),
  [C.InternalApiMissingCompensation]: internal(
    500,
    false,
    'Una operación que modifica datos no declara su compensación.',
  ),
  [C.InternalApiMissingHandler]: internal(
    500,
    false,
    'La operación interna no tiene manejador.',
  ),
  [C.InternalApiTimeout]: internal(
    504,
    true,
    'La operación interna no respondió a tiempo.',
  ),
  [C.InternalApiNonJsonSafeSchema]: internal(
    500,
    false,
    'El esquema de la operación interna no se puede serializar a JSON.',
  ),
  [C.InternalApiInvalidOperation]: internal(
    500,
    false,
    'El valor recibido no es una operación declarada con defineOperation ni con @Operation.',
  ),
  [C.InternalApiInvalidIdempotencyKey]: internal(
    400,
    false,
    'La llave de idempotencia o el tenant de la llamada interna falta o supera la longitud máxima.',
  ),
  [C.InternalApiIdempotencyKeyReuse]: internal(
    409,
    false,
    'La llave de idempotencia de la operación interna ya se usó con otra entrada.',
  ),
  [C.InternalApiPayloadTooLarge]: internal(
    413,
    false,
    'La entrada o la salida de la operación interna supera el tamaño máximo.',
  ),
  [C.InternalApiInvalidHandlerResult]: internal(
    500,
    false,
    'El manejador de la operación interna devolvió un resultado que no es un CallOutcome.',
  ),
  [C.MessagingInvalidEnvelope]: internal(
    400,
    false,
    'El sobre del mensaje no cumple el formato CloudEvents esperado.',
  ),
  [C.MessagingInvalidPayload]: internal(
    400,
    false,
    'El payload del mensaje no cumple su contrato.',
  ),
  [C.MessagingInvalidRetryPolicy]: internal(
    500,
    false,
    'La política de reintentos del consumidor es inválida.',
  ),
  [C.MessagingInvalidTopology]: internal(
    500,
    false,
    'La topología de mensajería es inválida.',
  ),
  [C.MessagingUnknownRoute]: internal(
    500,
    false,
    'No hay ruta configurada para el tipo de mensaje.',
  ),
  [C.MessagingUnknownQueue]: internal(
    500,
    false,
    'La cola indicada no existe en la topología.',
  ),
  [C.MessagingDuplicateHandler]: internal(
    500,
    false,
    'Dos manejadores atienden el mismo tipo de mensaje en la misma cola.',
  ),
  [C.MessagingPermanentError]: internal(
    500,
    false,
    'El manejador falló de forma permanente; el mensaje va a la cola de errores.',
  ),
  [C.MessagingPayloadTooLarge]: internal(
    413,
    false,
    'El mensaje supera el tamaño máximo permitido.',
  ),
  [C.SagaNotFound]: internal(404, false, 'La saga no existe.'),
  [C.SagaDuplicateSaga]: internal(
    409,
    false,
    'Ya existe una saga con ese identificador.',
  ),
  [C.SagaUnknownDefinition]: internal(
    500,
    false,
    'La definición de saga no está registrada.',
  ),
  [C.SagaInvalidDefinition]: internal(
    500,
    false,
    'La definición de saga es inválida.',
  ),
  [C.SagaInvalidConfiguration]: internal(
    500,
    false,
    'La configuración del orquestador de sagas es inválida.',
  ),
  [C.SagaInvalidState]: internal(
    409,
    false,
    'La saga no está en un estado que permita la acción.',
  ),
  [C.SagaMissingCompensation]: internal(
    500,
    false,
    'Un paso de la saga modifica datos y no declara compensación.',
  ),
  [C.SagaConcurrentModification]: internal(
    409,
    true,
    'Otro proceso modificó la saga al mismo tiempo.',
  ),
  [C.SagaLeaseNotAcquired]: internal(
    409,
    true,
    'Otro proceso tiene el turno de la saga.',
  ),
  [C.SagaLeaseLost]: internal(
    409,
    true,
    'El proceso perdió el turno de la saga durante la ejecución.',
  ),
  [C.SagaTransientFailure]: internal(
    503,
    true,
    'Un paso de la saga falló de forma transitoria.',
  ),
  [C.SagaProtocolViolation]: internal(
    500,
    false,
    'Un paso de la saga devolvió una respuesta fuera de su contrato.',
  ),
  [C.SagaUncertainOutcome]: internal(
    504,
    true,
    'No se sabe si un paso de la saga se aplicó; se reintenta con la misma llave.',
  ),
  [C.SagaStateUpdateFailed]: internal(
    500,
    true,
    'No se pudo guardar el estado de la saga.',
  ),
  [C.SagaInputBuildFailed]: internal(
    500,
    false,
    'No se pudo construir la entrada de un paso de la saga.',
  ),
  [C.SagaIdempotencyKeyConflict]: internal(
    409,
    false,
    'La clave de idempotencia ya se usó con otra entrada.',
  ),
  [C.SagaDeadlineExceeded]: internal(
    504,
    false,
    'La saga superó su plazo máximo.',
  ),
  [C.SagaSimulatedCrash]: internal(
    500,
    true,
    'Caída simulada en pruebas de recuperación de sagas.',
  ),
  [C.BloomInvalidParameters]: internal(
    500,
    false,
    'Los parámetros del filtro de Bloom son inválidos.',
  ),
  [C.BloomCorruptedData]: internal(
    500,
    false,
    'Los datos serializados del filtro de Bloom están corruptos.',
  ),
  [C.BloomIncompatibleFilters]: internal(
    500,
    false,
    'Los filtros de Bloom no tienen los mismos parámetros.',
  ),
  [C.BloomUnknownFilter]: internal(
    500,
    false,
    'El filtro de Bloom no está registrado.',
  ),
  [C.BloomDuplicateFilter]: internal(
    500,
    false,
    'Ya hay un filtro de Bloom registrado con ese nombre.',
  ),
  [C.CacheInvalidArgument]: internal(
    500,
    false,
    'Argumento inválido al usar la caché.',
  ),
  [C.CacheKeyTooLong]: internal(
    500,
    false,
    'La llave de caché supera la longitud máxima.',
  ),
  [C.CacheValueTooLarge]: internal(
    500,
    false,
    'El valor supera el tamaño máximo que se guarda en caché.',
  ),
  [C.CacheNotACounter]: internal(
    500,
    false,
    'La entrada de caché no contiene un contador.',
  ),
  [C.CacheTimeout]: internal(
    504,
    true,
    'La caché no respondió dentro del plazo.',
  ),
  [C.CacheCorruptEntry]: internal(
    500,
    false,
    'Una entrada de caché tiene un formato inválido.',
  ),
  [C.ConfigInvalid]: internal(
    500,
    false,
    'La configuración del proceso no es válida.',
  ),
  [C.MessagingTenantMismatch]: internal(
    403,
    false,
    'El tenant del mensaje no coincide con el esperado.',
  ),
  [C.MessagingIdempotencyConflict]: internal(
    409,
    false,
    'Se reutilizó el id de un mensaje con otro contenido.',
  ),
  [C.MessagingInvalidOptions]: internal(
    500,
    false,
    'Las opciones de mensajería no son válidas.',
  ),
  [C.PrimitivesInvalidArgument]: internal(
    500,
    false,
    'Argumento inválido en una primitiva de plataforma.',
  ),
  [C.PrimitivesNonJsonValue]: internal(
    500,
    false,
    'Un valor no se puede serializar como JSON canónico.',
  ),
  [C.PrimitivesDeadlineExceeded]: internal(
    504,
    false,
    'Se agotó el plazo de la operación.',
  ),
  [C.PrimitivesStaleClaim]: internal(
    409,
    false,
    'El claim de idempotencia ya pertenece a otro dueño.',
  ),
  [C.PersistenceQueryFailed]: internal(
    500,
    false,
    'Falló una sentencia en la base de datos.',
  ),
  [C.PersistenceInvalidConfig]: internal(
    500,
    false,
    'La configuración de persistencia no es válida.',
  ),
  [C.PersistenceTransactionRequired]: internal(
    500,
    false,
    'La operación exige una transacción abierta.',
  ),
  [C.PersistenceTenantRequired]: internal(
    400,
    false,
    'La operación exige un tenant en el contexto.',
  ),
  [C.PersistenceTenantMismatch]: internal(
    403,
    false,
    'La fila pertenece a otro tenant.',
  ),
  [C.PersistenceCorruptRow]: internal(
    500,
    false,
    'Una fila leída no tiene el formato esperado.',
  ),
  [C.PersistenceContention]: internal(
    503,
    true,
    'Hay contención sobre el mismo registro; reintentar.',
  ),
  [C.ResilienceUnknownPolicy]: internal(
    500,
    false,
    'No existe la política de resiliencia pedida.',
  ),
  [C.ResilienceNotConfigured]: internal(
    500,
    false,
    'El registro de resiliencia no está configurado.',
  ),
  [C.ShardingInvalidConfig]: internal(
    500,
    false,
    'La configuración de sharding no es válida.',
  ),
  [C.ShardingInvalidKey]: internal(
    400,
    false,
    'La llave de enrutamiento no es válida.',
  ),
  [C.ShardingInvalidTenantId]: internal(
    400,
    false,
    'El id del tenant no tiene el formato esperado.',
  ),
});
