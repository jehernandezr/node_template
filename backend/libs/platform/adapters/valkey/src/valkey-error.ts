import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';

/** Stable error codes of `@platform/adapters-valkey`. */
export enum ValkeyErrorCode {
  CommandFailed = 'PLATFORM.VALKEY.COMMAND_FAILED',
  UnexpectedReply = 'PLATFORM.VALKEY.UNEXPECTED_REPLY',
}

/**
 * Error replies that a later attempt can fix: the server is loading, busy, failing over or read-only
 * during a switchover.
 */
const TRANSIENT_REPLIES: ReadonlySet<string> = new Set([
  'LOADING',
  'BUSY',
  'TRYAGAIN',
  'CLUSTERDOWN',
  'MASTERDOWN',
  'READONLY',
  'NOREPLICAS',
]);

/** Message iovalkey uses when `commandTimeout` expires. */
const COMMAND_TIMEOUT_MESSAGE = 'Command timed out';

/**
 * A Valkey command failed. `failureKind` lets `classifyFailure` (and so the resilience breaker) tell a
 * dead or failing-over server (transient) from a bad command (permanent). The message names the command,
 * never keys or values.
 */
export class ValkeyCommandError extends PlatformError {
  override readonly code = ValkeyErrorCode.CommandFailed;
  readonly failureKind: FailureKind;
  /** Command that failed, for example `GET` or `EVALSHA`. */
  readonly command: string;

  constructor(command: string, failureKind: FailureKind, cause: unknown) {
    super(`Valkey command ${command} failed`, {
      retryable: failureKind === FailureKind.Transient,
      details: { command, failureKind },
      cause,
    });
    this.command = command;
    this.failureKind = failureKind;
  }
}

/** The server answered with a shape the adapter does not expect. A wrong server, module or key type. */
export class ValkeyUnexpectedReplyError extends PlatformError {
  override readonly code = ValkeyErrorCode.UnexpectedReply;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(command: string, expected: string) {
    super(`Valkey command ${command} returned an unexpected reply`, {
      details: { command, expected },
    });
  }
}

function errorName(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null
    ? String((error as { name?: unknown }).name)
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** True for an error reply of the server (as opposed to a connection or client failure). */
export function isReplyError(error: unknown): boolean {
  return errorName(error) === 'ReplyError';
}

/** First word of an error reply, such as `WRONGTYPE` or `NOSCRIPT`. */
export function replyPrefix(error: unknown): string {
  return errorMessage(error).split(' ', 1)[0] ?? '';
}

/**
 * How a client error fails:
 * - an error reply is transient only for the prefixes of a loading, busy or failing-over server;
 * - iovalkey's `commandTimeout` is a timeout;
 * - anything else (refused or closed connection, retries exhausted, offline queue) is transient.
 */
export function classifyValkeyError(error: unknown): FailureKind {
  if (isReplyError(error)) {
    return TRANSIENT_REPLIES.has(replyPrefix(error))
      ? FailureKind.Transient
      : FailureKind.Permanent;
  }
  if (errorMessage(error) === COMMAND_TIMEOUT_MESSAGE) {
    return FailureKind.Timeout;
  }
  return FailureKind.Transient;
}

/** Wraps a client error in a {@link ValkeyCommandError}. Platform errors pass through unchanged. */
export function toValkeyError(error: unknown, command: string): PlatformError {
  if (error instanceof PlatformError) {
    return error;
  }
  return new ValkeyCommandError(command, classifyValkeyError(error), error);
}
