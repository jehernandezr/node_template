import type { ErrorAudience } from '../enums/error-audience.enum.js';

/**
 * Entrada del catálogo de errores: estado HTTP, si el cliente puede reintentar,
 * audiencia, clave ARB del mensaje (es y en) y descripción para documentación.
 */
export interface ErrorCatalogEntry {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly audience: ErrorAudience;
  /** Clave ARB del front, por ejemplo `error_platform_auth_forbidden`. */
  readonly messageKey: string;
  readonly description: string;
}
