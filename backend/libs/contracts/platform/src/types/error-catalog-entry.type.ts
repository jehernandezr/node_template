import type { ErrorAudience } from '../enums/error-audience.enum.js';
import type { ProblemDetailKey } from '../enums/problem-detail-key.enum.js';

/**
 * Error catalog entry: HTTP status, whether the client can retry,
 * audience, ARB key of the message (es and en) and description for documentation.
 */
export interface ErrorCatalogEntry {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly audience: ErrorAudience;
  /** Front ARB key, for example `error_platform_auth_forbidden`. */
  readonly messageKey: string;
  readonly description: string;
  /** Error data that reaches the client in `ProblemDetails.details`. Only public codes publish them. */
  readonly publicDetails?: readonly ProblemDetailKey[];
}
