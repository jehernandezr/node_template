import { AuthenticationError } from '@platform/auth';
import { StreamRejectionStatus } from './stream-rejection-status.enum.js';

/**
 * Why a stream was refused, as the transports report it. A credential that is not valid answers 401, so the client
 * signs in again; a revocation state that cannot be checked answers 503, so the client keeps its session and
 * reconnects later.
 */
export class StreamRejection {
  /** Seconds a client waits before opening the stream again after a 503. */
  static readonly RETRY_AFTER_SECONDS = 5;

  private constructor(
    readonly status: StreamRejectionStatus,
    readonly code: string,
    readonly title: string,
  ) {}

  /**
   * The rejection of an authentication failure.
   * @param error What the authenticator threw.
   * @returns The rejection, or `undefined` when the error is not an authentication failure.
   */
  static of(error: unknown): StreamRejection | undefined {
    if (!(error instanceof AuthenticationError)) {
      return undefined;
    }
    return error.retryable
      ? new StreamRejection(
          StreamRejectionStatus.Unavailable,
          error.code,
          'Service Unavailable',
        )
      : new StreamRejection(
          StreamRejectionStatus.Unauthenticated,
          error.code,
          'Unauthenticated',
        );
  }

  /**
   * Whether the client should keep its session and retry later.
   * @returns True for a 503.
   */
  get retryable(): boolean {
    return this.status === StreamRejectionStatus.Unavailable;
  }

  /**
   * The problem body of the rejection.
   * @returns Title, status and code.
   */
  problem(): { title: string; status: number; code: string } {
    return { title: this.title, status: this.status, code: this.code };
  }
}
