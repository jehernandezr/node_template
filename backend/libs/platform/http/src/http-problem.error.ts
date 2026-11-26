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
 * Error the HTTP entry throws before reaching a use case. The `code` is one from the platform
 * or identity catalog; the filter converts it into Problem Details.
 */
export class HttpProblemError extends PlatformError {
  override readonly code: string;
  /** One error per field, when contract validation fails. */
  readonly fieldErrors?: FieldError[];
  /** Seconds to wait for `Retry-After`, when the client must wait. */
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

  /**
   * The input does not match the contract.
   * @param errors Field errors.
   * @returns The error.
   */
  static invalidInput(errors: FieldError[]): HttpProblemError {
    return new HttpProblemError(
      'Request input does not match the contract',
      PlatformErrorCode.ValidationInvalidInput,
      { fieldErrors: errors },
    );
  }

  /**
   * The body exceeds the limit.
   * @returns The error.
   */
  static payloadTooLarge(): HttpProblemError {
    return new HttpProblemError(
      'Request body exceeds the allowed size',
      PlatformErrorCode.HttpPayloadTooLarge,
    );
  }

  /**
   * The body is not JSON.
   * @returns The error.
   */
  static unsupportedMediaType(): HttpProblemError {
    return new HttpProblemError(
      'Request body media type is not supported',
      PlatformErrorCode.HttpUnsupportedMediaType,
    );
  }

  /**
   * The body is not valid JSON.
   * @returns The error.
   */
  static malformedBody(): HttpProblemError {
    return new HttpProblemError(
      'Request body is not valid JSON',
      PlatformErrorCode.HttpMalformedBody,
    );
  }

  /**
   * The `Origin` is not allowed.
   * @returns The error.
   */
  static originRejected(): HttpProblemError {
    return new HttpProblemError(
      'Request origin is not allowed',
      PlatformErrorCode.AuthOriginRejected,
    );
  }

  /**
   * The requested API version is not supported.
   * @param version Requested version.
   * @returns The error.
   */
  static unsupportedVersion(version: string): HttpProblemError {
    return new HttpProblemError(
      'API version is not supported',
      PlatformErrorCode.ApiUnsupportedVersion,
      { details: { version } },
    );
  }

  /**
   * The route version reached its sunset.
   * @param routeId Route id.
   * @returns The error.
   */
  static versionSunset(routeId: string): HttpProblemError {
    return new HttpProblemError(
      'API route is no longer available',
      PlatformErrorCode.ApiVersionSunset,
      { details: { routeId } },
    );
  }

  /**
   * The resource does not exist or is not visible.
   * @returns The error.
   */
  static notFound(): HttpProblemError {
    return new HttpProblemError(
      'Resource not found',
      PlatformErrorCode.ResourceNotFound,
    );
  }

  /**
   * The actor lacks permissions.
   * @param missing Missing permissions.
   * @returns The error.
   */
  static forbidden(missing: readonly string[]): HttpProblemError {
    return new HttpProblemError(
      'Access denied',
      PlatformErrorCode.AuthForbidden,
      {
        details: { missing: [...missing] },
      },
    );
  }

  /**
   * The plan does not include a feature.
   * @param missing Missing features.
   * @returns The error.
   */
  static featureNotIncluded(missing: readonly string[]): HttpProblemError {
    return new HttpProblemError(
      'The plan does not include this feature',
      PlatformErrorCode.AccessFeatureNotIncluded,
      { details: { missing: [...missing] } },
    );
  }

  /**
   * A disabled flag responds like a nonexistent route: it does not reveal that the feature exists.
   * @returns The error.
   */
  static flagDisabled(): HttpProblemError {
    return new HttpProblemError(
      'Not found',
      PlatformErrorCode.AccessFlagDisabled,
    );
  }

  /**
   * The route needs a recent second factor.
   * @returns The error.
   */
  static stepUpRequired(): HttpProblemError {
    return new HttpProblemError(
      'Recent multi-factor authentication is required',
      IdentityErrorCode.MfaStepUpRequired,
    );
  }

  /**
   * The rate limit was exceeded.
   * @param retryAfterSeconds Seconds to wait.
   * @returns The error.
   */
  static rateLimited(retryAfterSeconds: number): HttpProblemError {
    return new HttpProblemError(
      'Rate limit exceeded',
      PlatformErrorCode.RateLimitExceeded,
      { retryable: true, retryAfterSeconds },
    );
  }

  /**
   * The request exceeded its deadline.
   * @returns The error.
   */
  static timeout(): HttpProblemError {
    return new HttpProblemError(
      'Request handler exceeded its time limit',
      PlatformErrorCode.ResilienceTimeout,
      { retryable: true },
    );
  }
}
