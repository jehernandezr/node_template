import type { ValkeyArgument } from './valkey-argument.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandRunner } from './valkey-command-runner.js';
import type { ValkeyErrorTranslator } from './valkey-error-translator.js';
import { ValkeyUnexpectedReplyError } from './valkey-unexpected-reply.error.js';
import type { LuaScript } from './lua-script.js';

/**
 * Sends commands and scripts through a client and translates any failure into a
 * `ValkeyCommandError` that the `FailureClassifier` understands. It also reads
 * replies with a known shape. It is the only thing the adapters use from the client.
 */
export class ValkeyCommandExecutor {
  constructor(
    private readonly client: ValkeyCommandRunner,
    private readonly errors: ValkeyErrorTranslator,
  ) {}

  /** Sends a command. */
  async run(command: ValkeyCommand, args: ValkeyArgument[]): Promise<unknown> {
    try {
      return await this.client.call(command, args);
    } catch (error) {
      throw this.errors.translate(error, command);
    }
  }

  /**
   * Runs a script with `EVALSHA` and, if the server does not have it cached
   * (`NOSCRIPT`, for example after a restart or a failover), with `EVAL`.
   */
  async script(
    script: LuaScript,
    keys: readonly string[],
    args: readonly ValkeyArgument[],
  ): Promise<unknown> {
    const tail: ValkeyArgument[] = [keys.length, ...keys, ...args];
    try {
      return await this.client.call(ValkeyCommand.EvalSha, [
        script.sha,
        ...tail,
      ]);
    } catch (error) {
      if (
        this.errors.isReplyError(error) &&
        this.errors.replyPrefix(error) === 'NOSCRIPT'
      ) {
        return this.run(ValkeyCommand.Eval, [script.source, ...tail]);
      }
      throw this.errors.translate(error, ValkeyCommand.EvalSha);
    }
  }

  /** Reads an integer reply. */
  integer(command: ValkeyCommand, reply: unknown): number {
    if (typeof reply !== 'number' || !Number.isSafeInteger(reply)) {
      throw new ValkeyUnexpectedReplyError(command, 'an integer');
    }
    return reply;
  }

  /** Reads a text reply that may be null. */
  optionalString(command: ValkeyCommand, reply: unknown): string | undefined {
    if (reply === null) {
      return undefined;
    }
    if (typeof reply !== 'string') {
      throw new ValkeyUnexpectedReplyError(command, 'a string or nil');
    }
    return reply;
  }
}
