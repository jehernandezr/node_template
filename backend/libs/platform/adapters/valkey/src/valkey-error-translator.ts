import { FailureKind, PlatformError } from '@platform/kernel';
import { FailureRule } from '@platform/primitives';
import { ValkeyCommandError } from './valkey-command.error.js';

/**
 * Translates iovalkey client errors. As a `FailureRule` it tells the
 * `FailureClassifier` how a server reply error fails; as a
 * translator it wraps any client error in a `ValkeyCommandError`.
 */
export class ValkeyErrorTranslator extends FailureRule {
  /**
   * Error replies that a later attempt can fix: the server
   * is loading, busy, in failover or read-only during a switch.
   */
  private static readonly TRANSIENT_REPLIES: ReadonlySet<string> = new Set([
    'LOADING',
    'BUSY',
    'TRYAGAIN',
    'CLUSTERDOWN',
    'MASTERDOWN',
    'READONLY',
    'NOREPLICAS',
  ]);

  /** Message iovalkey uses when `commandTimeout` expires. */
  private static readonly COMMAND_TIMEOUT_MESSAGE = 'Command timed out';

  /** Only judges a server reply error; the rest is left to the classifier. */
  classify(error: object): FailureKind | undefined {
    return this.isReplyError(error) ? this.kindOf(error) : undefined;
  }

  /**
   * Returns how a client error fails:
   * - an error reply is transient only with the prefixes of a server that is loading, busy or in failover;
   * - the iovalkey `commandTimeout` is a timeout;
   * - anything else (connection refused or closed, retries exhausted, queue without connection) is transient.
   */
  kindOf(error: unknown): FailureKind {
    if (this.isReplyError(error)) {
      return ValkeyErrorTranslator.TRANSIENT_REPLIES.has(
        this.replyPrefix(error),
      )
        ? FailureKind.Transient
        : FailureKind.Permanent;
    }
    if (
      this.messageOf(error) === ValkeyErrorTranslator.COMMAND_TIMEOUT_MESSAGE
    ) {
      return FailureKind.Timeout;
    }
    return FailureKind.Transient;
  }

  /** Wraps a client error in a {@link ValkeyCommandError}. Platform errors pass through unchanged. */
  translate(error: unknown, command: string): PlatformError {
    if (error instanceof PlatformError) {
      return error;
    }
    return new ValkeyCommandError(command, this.kindOf(error), error);
  }

  /** `true` for a server error reply (not a connection or client failure). */
  isReplyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      String((error as { name?: unknown }).name) === 'ReplyError'
    );
  }

  /** Returns the first word of an error reply, such as `WRONGTYPE` or `NOSCRIPT`. */
  replyPrefix(error: unknown): string {
    return this.messageOf(error).split(' ', 1)[0] ?? '';
  }

  private messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
