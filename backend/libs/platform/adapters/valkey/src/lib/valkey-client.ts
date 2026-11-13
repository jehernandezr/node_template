import { createHash } from 'node:crypto';
import { Valkey } from 'iovalkey';
import {
  isReplyError,
  replyPrefix,
  toValkeyError,
  ValkeyUnexpectedReplyError,
} from './valkey-error.js';

/** Commands the adapters send. */
export enum ValkeyCommand {
  Get = 'GET',
  Set = 'SET',
  Del = 'DEL',
  Incr = 'INCR',
  Hget = 'HGET',
  Pexpire = 'PEXPIRE',
  Eval = 'EVAL',
  EvalSha = 'EVALSHA',
  Publish = 'PUBLISH',
  Bitfield = 'BITFIELD',
  BitfieldReadOnly = 'BITFIELD_RO',
  BloomReserve = 'BF.RESERVE',
  BloomInsert = 'BF.INSERT',
  BloomExists = 'BF.EXISTS',
}

/** Argument of a command. */
export type ValkeyArgument = string | number | Buffer;

/**
 * The part of a Valkey client the adapters use: one generic command call. An iovalkey `Valkey` (or
 * `Cluster`) instance satisfies it; keys that a script touches together share a hash tag, so they also work
 * on a cluster.
 */
export interface ValkeyCommandRunner {
  call(command: string, args: ValkeyArgument[]): Promise<unknown>;
}

/**
 * Sends one command and wraps any failure in a `ValkeyCommandError` that `classifyFailure` understands.
 */
export async function runCommand(
  runner: ValkeyCommandRunner,
  command: ValkeyCommand,
  args: ValkeyArgument[],
): Promise<unknown> {
  try {
    return await runner.call(command, args);
  } catch (error) {
    throw toValkeyError(error, command);
  }
}

/**
 * A Lua script run with `EVALSHA`, falling back to `EVAL` when the server does not have it cached
 * (`NOSCRIPT`, for example after a restart or a failover). Scripts run atomically on the server.
 */
export class LuaScript {
  /** SHA-1 of the source, the name Valkey gives the script. Not a security hash. */
  readonly sha: string;

  constructor(readonly source: string) {
    this.sha = createHash('sha1').update(source).digest('hex');
  }

  async run(
    runner: ValkeyCommandRunner,
    keys: readonly string[],
    args: readonly ValkeyArgument[],
  ): Promise<unknown> {
    const tail: ValkeyArgument[] = [keys.length, ...keys, ...args];
    try {
      return await runner.call(ValkeyCommand.EvalSha, [this.sha, ...tail]);
    } catch (error) {
      if (isReplyError(error) && replyPrefix(error) === 'NOSCRIPT') {
        return runCommand(runner, ValkeyCommand.Eval, [this.source, ...tail]);
      }
      throw toValkeyError(error, ValkeyCommand.EvalSha);
    }
  }
}

/** Reads an integer reply. */
export function integerReply(command: ValkeyCommand, reply: unknown): number {
  if (typeof reply !== 'number' || !Number.isSafeInteger(reply)) {
    throw new ValkeyUnexpectedReplyError(command, 'an integer');
  }
  return reply;
}

/** Reads a bulk string reply that may be nil. */
export function optionalStringReply(
  command: ValkeyCommand,
  reply: unknown,
): string | undefined {
  if (reply === null) {
    return undefined;
  }
  if (typeof reply !== 'string') {
    throw new ValkeyUnexpectedReplyError(command, 'a string or nil');
  }
  return reply;
}

/** Connection settings for {@link createValkeyClient}. Credentials come from configuration, never code. */
export interface ValkeyConnectionOptions {
  /** `redis://` or `rediss://` (TLS) URL, for example `VALKEY_URL`. */
  readonly url: string;
  /** Time to establish a connection. Default 2 000 ms. */
  readonly connectTimeoutMs?: number;
  /**
   * Upper bound of one command in the client. Default 1 000 ms. The resilience policy of each caller
   * (for the cache, `ResiliencePolicyName.Cache`) sets the real, shorter limit; this one only keeps a
   * command from hanging forever.
   */
  readonly commandTimeoutMs?: number;
  /** Name shown by `CLIENT LIST`, for example the service name. */
  readonly connectionName?: string;
}

/**
 * Creates an iovalkey client tuned for the adapters: connects on the first command, retries a command at
 * most once while reconnecting (so an outage fails fast and the breaker can open), and bounds each command.
 * Pub/sub needs its own connection: use `client.duplicate()` for the subscriber.
 */
export function createValkeyClient(options: ValkeyConnectionOptions): Valkey {
  return new Valkey(options.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: options.connectTimeoutMs ?? 2_000,
    commandTimeout: options.commandTimeoutMs ?? 1_000,
    connectionName: options.connectionName,
  });
}
