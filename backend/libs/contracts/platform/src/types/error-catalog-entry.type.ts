import type { ErrorAudience } from '../enums/error-audience.enum.js';
import type { ProblemDetailKey } from '../enums/problem-detail-key.enum.js';

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
  /** Datos del error que salen al cliente en `ProblemDetails.details`. Solo los códigos públicos los publican. */
  readonly publicDetails?: readonly ProblemDetailKey[];
}
