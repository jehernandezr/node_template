import { PlatformErrorCode } from './platform-error-code.js';

/**
 * Entrada del catálogo de errores: estado HTTP, si el cliente puede reintentar,
 * clave i18n del mensaje (es y en) y descripción para documentación.
 */
export interface ErrorCatalogEntry {
  code: string;
  httpStatus: number;
  retryable: boolean;
  messageKey: string;
  description: string;
}

export const platformErrorCatalog: readonly ErrorCatalogEntry[] = [
  {
    code: PlatformErrorCode.ValidationInvalidInput,
    httpStatus: 400,
    retryable: false,
    messageKey: 'errors.platform.validation.invalid_input',
    description: 'La entrada no cumple el formato o las reglas esperadas.',
  },
  {
    code: PlatformErrorCode.ValidationRequired,
    httpStatus: 400,
    retryable: false,
    messageKey: 'errors.platform.validation.required',
    description: 'Falta un campo obligatorio.',
  },
  {
    code: PlatformErrorCode.InternalUnexpected,
    httpStatus: 500,
    retryable: false,
    messageKey: 'errors.platform.internal.unexpected',
    description: 'Ocurrió un error inesperado en el servidor.',
  },
  {
    code: PlatformErrorCode.AuthUnauthenticated,
    httpStatus: 401,
    retryable: false,
    messageKey: 'errors.platform.auth.unauthenticated',
    description: 'La solicitud no incluye credenciales válidas.',
  },
  {
    code: PlatformErrorCode.AuthForbidden,
    httpStatus: 403,
    retryable: false,
    messageKey: 'errors.platform.auth.forbidden',
    description: 'No tienes permiso para realizar esta acción.',
  },
  {
    code: PlatformErrorCode.RateLimitExceeded,
    httpStatus: 429,
    retryable: true,
    messageKey: 'errors.platform.rate_limit.exceeded',
    description:
      'Se superó el límite de solicitudes. Intenta de nuevo más tarde.',
  },
  {
    code: PlatformErrorCode.ApiVersionSunset,
    httpStatus: 410,
    retryable: false,
    messageKey: 'errors.platform.api.version_sunset',
    description: 'Esta versión de la API ya no está disponible.',
  },
  {
    code: PlatformErrorCode.ResourceNotFound,
    httpStatus: 404,
    retryable: false,
    messageKey: 'errors.platform.resource.not_found',
    description: 'El recurso solicitado no existe.',
  },
  {
    code: PlatformErrorCode.ConflictVersionMismatch,
    httpStatus: 409,
    retryable: false,
    messageKey: 'errors.platform.conflict.version_mismatch',
    description:
      'El recurso cambió desde la última lectura. Vuelve a cargarlo.',
  },
  {
    code: PlatformErrorCode.KernelInvalidId,
    httpStatus: 400,
    retryable: false,
    messageKey: 'errors.platform.kernel.invalid_id',
    description: 'El identificador no tiene un formato válido.',
  },
  {
    code: PlatformErrorCode.ShardingKeyMissing,
    httpStatus: 400,
    retryable: false,
    messageKey: 'errors.platform.sharding.key_missing',
    description: 'Falta la clave de fragmentación del tenant en la solicitud.',
  },
  {
    code: PlatformErrorCode.ShardingCrossShardTx,
    httpStatus: 409,
    retryable: false,
    messageKey: 'errors.platform.sharding.cross_shard_tx',
    description: 'La transacción involucra datos de más de un fragmento.',
  },
  {
    code: PlatformErrorCode.ShardingTenantMigrating,
    httpStatus: 503,
    retryable: true,
    messageKey: 'errors.platform.sharding.tenant_migrating',
    description:
      'El tenant se está migrando. Intenta de nuevo en unos instantes.',
  },
];

const CODE_PATTERN = /^[A-Z]+(\.[A-Z_]+){2}$/;

/**
 * Registro en memoria de entradas del catálogo, indexado por código.
 */
export class ErrorCatalog {
  private readonly entries = new Map<string, ErrorCatalogEntry>();

  /**
   * Registra entradas. Valida todas antes de guardar ninguna, así un lote
   * inválido no deja el catálogo a medias.
   */
  register(entries: readonly ErrorCatalogEntry[]): void {
    const batch = new Set<string>();
    for (const entry of entries) {
      if (!CODE_PATTERN.test(entry.code)) {
        throw new Error(`Código de error inválido: ${entry.code}`);
      }
      if (this.entries.has(entry.code) || batch.has(entry.code)) {
        throw new Error(`Código de error duplicado: ${entry.code}`);
      }
      batch.add(entry.code);
    }
    for (const entry of entries) {
      this.entries.set(entry.code, entry);
    }
  }

  get(code: string): ErrorCatalogEntry | undefined {
    return this.entries.get(code);
  }

  all(): ErrorCatalogEntry[] {
    return [...this.entries.values()];
  }
}
