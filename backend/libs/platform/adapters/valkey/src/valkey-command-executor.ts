import type { ValkeyArgument } from './valkey-argument.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandRunner } from './valkey-command-runner.js';
import type { ValkeyErrorTranslator } from './valkey-error-translator.js';
import { ValkeyUnexpectedReplyError } from './valkey-unexpected-reply.error.js';
import type { LuaScript } from './lua-script.js';

/**
 * Envía comandos y scripts por un cliente y traduce cualquier falla a un
 * `ValkeyCommandError` que el `FailureClassifier` entiende. Lee también las
 * respuestas con forma conocida. Es lo único que los adaptadores usan del cliente.
 */
export class ValkeyCommandExecutor {
  constructor(
    private readonly client: ValkeyCommandRunner,
    private readonly errors: ValkeyErrorTranslator,
  ) {}

  /** Envía un comando. */
  async run(command: ValkeyCommand, args: ValkeyArgument[]): Promise<unknown> {
    try {
      return await this.client.call(command, args);
    } catch (error) {
      throw this.errors.translate(error, command);
    }
  }

  /**
   * Corre un script con `EVALSHA` y, si el servidor no lo tiene en caché
   * (`NOSCRIPT`, por ejemplo tras un reinicio o un failover), con `EVAL`.
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

  /** Lee una respuesta entera. */
  integer(command: ValkeyCommand, reply: unknown): number {
    if (typeof reply !== 'number' || !Number.isSafeInteger(reply)) {
      throw new ValkeyUnexpectedReplyError(command, 'an integer');
    }
    return reply;
  }

  /** Lee una respuesta de texto que puede ser nula. */
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
