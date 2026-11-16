import type { FieldError } from '@contracts/platform';
import { PlatformErrorCode } from '@contracts/platform';
import { IdentityErrorCode } from '@contracts/identity';
import { PlatformError } from '@platform/kernel';

interface HttpProblemOptions {
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly fieldErrors?: FieldError[];
  readonly retryAfterSeconds?: number;
}

/**
 * Error que la entrada HTTP lanza antes de llegar a un caso de uso. El `code` es uno del catálogo
 * de la plataforma o de identity; el filtro lo convierte en Problem Details.
 */
export class HttpProblemError extends PlatformError {
  override readonly code: string;
  /** Un error por campo, cuando la validación del contrato falla. */
  readonly fieldErrors?: FieldError[];
  /** Segundos de espera para `Retry-After`, cuando el cliente debe esperar. */
  readonly retryAfterSeconds?: number;

  private constructor(
    message: string,
    code: string,
    options: HttpProblemOptions = {},
  ) {
    super(message, {
      retryable: options.retryable ?? false,
      ...(options.details !== undefined && { details: options.details }),
    });
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  static invalidInput(errors: FieldError[]): HttpProblemError {
    return new HttpProblemError(
      'Request input does not match the contract',
      PlatformErrorCode.ValidationInvalidInput,
      { fieldErrors: errors },
    );
  }

  static payloadTooLarge(): HttpProblemError {
    return new HttpProblemError(
      'Request body exceeds the allowed size',
      PlatformErrorCode.HttpPayloadTooLarge,
    );
  }

  static unsupportedMediaType(): HttpProblemError {
    return new HttpProblemError(
      'Request body media type is not supported',
      PlatformErrorCode.HttpUnsupportedMediaType,
    );
  }

  static malformedBody(): HttpProblemError {
    return new HttpProblemError(
      'Request body is not valid JSON',
      PlatformErrorCode.HttpMalformedBody,
    );
  }

  static originRejected(): HttpProblemError {
    return new HttpProblemError(
      'Request origin is not allowed',
      PlatformErrorCode.AuthOriginRejected,
    );
  }

  static unsupportedVersion(version: string): HttpProblemError {
    return new HttpProblemError(
      'API version is not supported',
      PlatformErrorCode.ApiUnsupportedVersion,
      { details: { version } },
    );
  }

  static versionSunset(routeId: string): HttpProblemError {
    return new HttpProblemError(
      'API route is no longer available',
      PlatformErrorCode.ApiVersionSunset,
      { details: { routeId } },
    );
  }

  static notFound(): HttpProblemError {
    return new HttpProblemError(
      'Resource not found',
      PlatformErrorCode.ResourceNotFound,
    );
  }

  static forbidden(missing: readonly string[]): HttpProblemError {
    return new HttpProblemError(
      'Access denied',
      PlatformErrorCode.AuthForbidden,
      {
        details: { missing: [...missing] },
      },
    );
  }

  static stepUpRequired(): HttpProblemError {
    return new HttpProblemError(
      'Recent multi-factor authentication is required',
      IdentityErrorCode.MfaStepUpRequired,
    );
  }

  static rateLimited(retryAfterSeconds: number): HttpProblemError {
    return new HttpProblemError(
      'Rate limit exceeded',
      PlatformErrorCode.RateLimitExceeded,
      { retryable: true, retryAfterSeconds },
    );
  }

  static timeout(): HttpProblemError {
    return new HttpProblemError(
      'Request handler exceeded its time limit',
      PlatformErrorCode.ResilienceTimeout,
      { retryable: true },
    );
  }
}
