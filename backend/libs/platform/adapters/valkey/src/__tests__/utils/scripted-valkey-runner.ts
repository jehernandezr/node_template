import type { ValkeyArgument } from '../../valkey-argument.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';

/** A sent command: name and arguments. */
export type RecordedCommand = readonly [string, ValkeyArgument[]];

/**
 * Test client that records each command and answers, in order, with what
 * it was given: a reply or an `Error` that it throws.
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

  /** Names of the commands sent, in order. */
  get commands(): string[] {
    return this.calls.map(([command]) => command);
  }
}
