import { FailureKind } from '@platform/kernel';
import { MessagingError, MessagingErrorCode } from '@platform/messaging';
import { FailureRule } from '@platform/primitives';
import type { AwsOperation } from './aws-operation.enum.js';

/** Shape of an AWS SDK error that the translator can read. */
interface SdkErrorShape {
  readonly name?: unknown;
  readonly $fault?: unknown;
  readonly $retryable?: unknown;
  readonly $metadata?: unknown;
}

/**
 * Translates AWS SDK errors. As a `FailureRule` it tells the
 * `FailureClassifier` whether an SDK error is transient or permanent; as a
 * translator it turns an operation's error into
 * `PLATFORM.MESSAGING.TRANSPORT_FAILED`, with the operation and the error
 * name in the message and never the sent body.
 */
export class AwsErrorTranslator extends FailureRule {
  /** Transient or permanent for an SDK error; `undefined` for anything else. */
  classify(error: object): FailureKind | undefined {
    if (!AwsErrorTranslator.isSdkError(error)) {
      return undefined;
    }
    return this.isRetryable(error)
      ? FailureKind.Transient
      : FailureKind.Permanent;
  }

  /**
   * Whether retrying can help: server faults, throttling and network
   * errors (without `$fault`). A client error (permission, nonexistent resource,
   * invalid parameter) does not change on retry.
   */
  isRetryable(error: unknown): boolean {
    const shape = (error ?? {}) as SdkErrorShape;
    if (shape.$retryable !== undefined && shape.$retryable !== null) {
      return true;
    }
    return shape.$fault !== 'client';
  }

  /** An already translated `MessagingError` passes through unchanged. */
  translate(
    operation: AwsOperation,
    error: unknown,
    target?: string,
  ): MessagingError {
    if (error instanceof MessagingError) {
      return error;
    }
    const name =
      typeof (error as SdkErrorShape | null)?.name === 'string'
        ? String((error as SdkErrorShape).name)
        : 'Error';
    return new MessagingError(
      MessagingErrorCode.TransportFailed,
      `${operation}${target === undefined ? '' : ` (${target})`} failed: ${name}`,
      { retryable: this.isRetryable(error), cause: error },
    );
  }

  private static isSdkError(error: object): boolean {
    const shape = error as SdkErrorShape;
    return (
      shape.$fault !== undefined ||
      shape.$retryable !== undefined ||
      shape.$metadata !== undefined
    );
  }
}
