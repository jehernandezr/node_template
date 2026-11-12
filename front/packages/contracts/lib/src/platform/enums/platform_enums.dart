// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Códigos de error públicos del contrato `platform`.
///
/// Solo incluye los códigos con audiencia `public`: los internos nunca
/// llegan al cliente. [messageKey] es la clave del mensaje en el ARB.
enum PlatformErrorCode {
  /// La entrada no cumple el formato o las reglas esperadas.
  validationInvalidInput(
    'PLATFORM.VALIDATION.INVALID_INPUT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_input',
  ),

  /// Falta un campo obligatorio.
  validationRequired(
    'PLATFORM.VALIDATION.REQUIRED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_required',
  ),

  /// Un campo tiene un tipo de dato distinto al esperado.
  validationInvalidType(
    'PLATFORM.VALIDATION.INVALID_TYPE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_type',
  ),

  /// Un campo no cumple el formato esperado, como email, UUID o patrón.
  validationInvalidFormat(
    'PLATFORM.VALIDATION.INVALID_FORMAT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_format',
  ),

  /// Un campo tiene un valor que no está entre los permitidos.
  validationInvalidEnum(
    'PLATFORM.VALIDATION.INVALID_ENUM',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_enum',
  ),

  /// Un texto o una lista tiene menos elementos de los permitidos.
  validationTooShort(
    'PLATFORM.VALIDATION.TOO_SHORT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_short',
  ),

  /// Un texto o una lista tiene más elementos de los permitidos.
  validationTooLong(
    'PLATFORM.VALIDATION.TOO_LONG',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_long',
  ),

  /// Un número es menor que el mínimo permitido.
  validationTooSmall(
    'PLATFORM.VALIDATION.TOO_SMALL',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_small',
  ),

  /// Un número es mayor que el máximo permitido.
  validationTooLarge(
    'PLATFORM.VALIDATION.TOO_LARGE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_large',
  ),

  /// La petición incluye un campo que el contrato no define.
  validationUnknownField(
    'PLATFORM.VALIDATION.UNKNOWN_FIELD',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_unknown_field',
  ),

  /// Ocurrió un error inesperado en el servidor.
  internalUnexpected(
    'PLATFORM.INTERNAL.UNEXPECTED',
    httpStatus: 500,
    retryable: false,
    messageKey: 'error_platform_internal_unexpected',
  ),

  /// La solicitud no incluye credenciales válidas.
  authUnauthenticated(
    'PLATFORM.AUTH.UNAUTHENTICATED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_platform_auth_unauthenticated',
  ),

  /// No tienes permiso para realizar esta acción.
  authForbidden(
    'PLATFORM.AUTH.FORBIDDEN',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_platform_auth_forbidden',
  ),

  /// Se superó el límite de solicitudes. Intenta de nuevo más tarde.
  rateLimitExceeded(
    'PLATFORM.RATE_LIMIT.EXCEEDED',
    httpStatus: 429,
    retryable: true,
    messageKey: 'error_platform_rate_limit_exceeded',
  ),

  /// Esta versión de la API ya no está disponible.
  apiVersionSunset(
    'PLATFORM.API.VERSION_SUNSET',
    httpStatus: 410,
    retryable: false,
    messageKey: 'error_platform_api_version_sunset',
  ),

  /// El recurso solicitado no existe.
  resourceNotFound(
    'PLATFORM.RESOURCE.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_platform_resource_not_found',
  ),

  /// El recurso cambió desde la última lectura. Vuelve a cargarlo.
  conflictVersionMismatch(
    'PLATFORM.CONFLICT.VERSION_MISMATCH',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_platform_conflict_version_mismatch',
  ),

  /// El identificador no tiene un formato válido.
  kernelInvalidId(
    'PLATFORM.KERNEL.INVALID_ID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_kernel_invalid_id',
  ),

  /// Falta la clave de fragmentación del tenant en la solicitud.
  shardingKeyMissing(
    'PLATFORM.SHARDING.KEY_MISSING',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_sharding_key_missing',
  ),

  /// La transacción involucra datos de más de un fragmento.
  shardingCrossShardTx(
    'PLATFORM.SHARDING.CROSS_SHARD_TX',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_platform_sharding_cross_shard_tx',
  ),

  /// El tenant se está migrando. Intenta de nuevo en unos instantes.
  shardingTenantMigrating(
    'PLATFORM.SHARDING.TENANT_MIGRATING',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_sharding_tenant_migrating',
  ),

  /// El tenant está en solo lectura por mantenimiento. Intenta más tarde.
  shardingTenantNotWritable(
    'PLATFORM.SHARDING.TENANT_NOT_WRITABLE',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_sharding_tenant_not_writable',
  ),

  /// La consulta filtra u ordena por un campo que no existe.
  criteriaUnknownField(
    'PLATFORM.CRITERIA.UNKNOWN_FIELD',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_criteria_unknown_field',
  ),

  /// La consulta tiene un valor o un cursor inválido.
  criteriaInvalidValue(
    'PLATFORM.CRITERIA.INVALID_VALUE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_criteria_invalid_value',
  ),

  /// El tamaño de página está fuera del rango permitido.
  criteriaInvalidLimit(
    'PLATFORM.CRITERIA.INVALID_LIMIT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_criteria_invalid_limit',
  ),

  /// Un servicio del que depende la operación no está disponible por ahora.
  resilienceCircuitOpen(
    'PLATFORM.RESILIENCE.CIRCUIT_OPEN',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_resilience_circuit_open',
  ),

  /// La operación tardó más de lo permitido.
  resilienceTimeout(
    'PLATFORM.RESILIENCE.TIMEOUT',
    httpStatus: 504,
    retryable: true,
    messageKey: 'error_platform_resilience_timeout',
  ),

  /// Hay demasiadas operaciones en curso. Intenta de nuevo en unos instantes.
  resilienceBulkheadFull(
    'PLATFORM.RESILIENCE.BULKHEAD_FULL',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_resilience_bulkhead_full',
  ),

  /// El servicio está sobrecargado. Intenta de nuevo en unos instantes.
  resilienceOverloaded(
    'PLATFORM.RESILIENCE.OVERLOADED',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_resilience_overloaded',
  );

  const PlatformErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Código exacto que envía el backend, por ejemplo `PLATFORM.VALIDATION.INVALID_INPUT`.
  final String code;

  /// Estado HTTP con el que responde el backend.
  final int httpStatus;

  /// Si el cliente puede reintentar la misma petición.
  final bool retryable;

  /// Clave ARB del mensaje para personas.
  final String messageKey;

  /// Igual a [code].
  String get wireCode => code;

  /// Valor con [code], o null si este cliente no lo conoce.
  static PlatformErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Igual a [fromCode].
  static PlatformErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `ErrorAudience` del contrato `platform`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ErrorAudience {
  public('public'),
  internal('internal');

  const ErrorAudience(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ErrorAudience? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `HttpMethod` del contrato `platform`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum HttpMethod {
  get('GET'),
  post('POST'),
  put('PUT'),
  patch('PATCH'),
  delete('DELETE');

  const HttpMethod(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static HttpMethod? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `AccessKind` del contrato `platform`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum AccessKind {
  public('public'),
  authenticated('authenticated');

  const AccessKind(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static AccessKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
