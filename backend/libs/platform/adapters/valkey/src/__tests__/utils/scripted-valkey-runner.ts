import type { ValkeyArgument } from '../../valkey-argument.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';

/** Un comando enviado: nombre y argumentos. */
export type RecordedCommand = readonly [string, ValkeyArgument[]];

/**
 * Cliente de prueba que guarda cada comando y responde, en orden, con lo que
 * se le dio: una respuesta o un `Error` que lanza.
 */
export class ScriptedValkeyRunner implements ValkeyCommandRunner {
  readonly calls: RecordedCommand[] = [];
  private readonly answers: unknown[];

  constructor(...answers: unknown[]) {
    this.answers = answers;
  }

  async call(command: string, args: ValkeyArgument[]): Promise<unknown> {
    this.calls.push([command, args]);
    const answer = this.answers.shift();
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  }

  /** Nombres de los comandos enviados, en orden. */
  get commands(): string[] {
    return this.calls.map(([command]) => command);
  }
}
