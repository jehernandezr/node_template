import type { ValkeyArgument } from './valkey-argument.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandRunner } from './valkey-command-runner.js';
import type { ValkeyErrorTranslator } from './valkey-error-translator.js';
import { ValkeyUnexpectedReplyError } from './valkey-unexpected-reply.error.js';
import type { LuaScript } from './lua-script.js';
import type { ValkeyCircuit } from './valkey-circuit.js';

/**
 * Sends commands and scripts through a client, each within the deadline and breaker of its `ValkeyCircuit`, and
 * translates any failure: `ValkeyUnavailableError` when Valkey does not answer, `ValkeyCommandError` when it rejects
 * the command. It also reads replies with a known shape. It is the only thing the adapters use from the client.
 */
export class ValkeyCommandExecutor {
  private static readonly NO_SCRIPT = Symbol('noscript');

  constructor(
    private readonly client: ValkeyCommandRunner,
    private readonly errors: ValkeyErrorTranslator,
    private readonly circuit: ValkeyCircuit,
  ) {}

  /**
   * Sends a command.
   * @param command Command name.
   * @param args Its arguments.
   * @returns The raw reply.
   * @throws ValkeyUnavailableError when Valkey does not answer in time or the circuit is open.
   * @throws ValkeyCommandError when the server rejects the command.
   */
  run(command: ValkeyCommand, args: ValkeyArgument[]): Promise<unknown> {
    return this.circuit.run(command, async () => {
      try {
        return await this.client.call(command, args);
      } catch (error) {
        throw this.errors.translate(error, command);
      }
    });
  }

  /**
   * Runs a script with `EVALSHA` and, if the server does not have it cached
   * (`NOSCRIPT`, for example after a restart or a failover), with `EVAL`.
   * @param script Lua script.
   * @param keys Keys it touches.
   * @param args Its arguments.
   * @returns The raw reply.
   * @throws ValkeyUnavailableError when Valkey does not answer in time or the circuit is open.
   * @throws ValkeyCommandError when the server rejects the script.
   */
  async script(
    script: LuaScript,
    keys: readonly string[],
    args: readonly ValkeyArgument[],
  ): Promise<unknown> {
    const tail: ValkeyArgument[] = [keys.length, ...keys, ...args];
    const reply = await this.circuit.run(ValkeyCommand.EvalSha, async () => {
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
          return ValkeyCommandExecutor.NO_SCRIPT;
        }
        throw this.errors.translate(error, ValkeyCommand.EvalSha);
      }
    });
    return reply === ValkeyCommandExecutor.NO_SCRIPT
      ? this.run(ValkeyCommand.Eval, [script.source, ...tail])
      : reply;
  }

  /**
   * Reads an integer reply.
   * @param command Command that replied.
   * @param reply Raw reply.
   * @returns The integer.
   */
  integer(command: ValkeyCommand, reply: unknown): number {
    if (typeof reply !== 'number' || !Number.isSafeInteger(reply)) {
      throw new ValkeyUnexpectedReplyError(command, 'an integer');
    }
    return reply;
  }

  /**
   * Reads a text reply that may be null.
   * @param command Command that replied.
   * @param reply Raw reply.
   * @returns The text, or `undefined`.
   */
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
