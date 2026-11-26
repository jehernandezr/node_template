import { DomainError } from '@platform/kernel';
import type { IdentityErrorCode } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';

/** Platform codes that an identity use case can respond with without depending on HTTP. */
export type IdentityPlatformCode =
  PlatformErrorCode.ResourceNotFound | PlatformErrorCode.AuthForbidden;

/**
 * An identity business rule that is not met. The code comes from the contract's catalog, which sets the
 * HTTP status and the audience; `details.retryAfterSeconds` becomes `Retry-After`.
 */
export class IdentityError extends DomainError {
  constructor(
    readonly code: IdentityErrorCode | IdentityPlatformCode,
    message: string = code,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, details);
  }

  /**
   * The resource does not exist or is not visible to the requester: does not reveal which of the two.
   * @returns The `PlatformErrorCode.ResourceNotFound` error.
   */
  static notFound(): IdentityError {
    return new IdentityError(PlatformErrorCode.ResourceNotFound);
  }

  /**
   * The actor lacks the `missing` permissions.
   * @param missing Permissions it lacks.
   * @returns The `PlatformErrorCode.AuthForbidden` error.
   */
  static forbidden(missing: readonly string[]): IdentityError {
    return new IdentityError(PlatformErrorCode.AuthForbidden, 'Access denied', {
      missing: [...new Set(missing)],
    });
  }

  /**
   * An error that asks to wait: the client receives `Retry-After` with the remaining seconds.
   * @param code Error code.
   * @param waitMs Milliseconds to wait.
   * @returns The error with its wait.
   */
  static retryAfter(code: IdentityErrorCode, waitMs: number): IdentityError {
    return new IdentityError(code, code, {
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    });
  }
}
