import { CommandRunner, type CommandRun } from '../../command-runner.js';

/** Anota cada comando y responde con el código que se le pida para la llamada número `n`, desde 1; si no, 0. */
export class RecordingCommandRunner extends CommandRunner {
  readonly runs: CommandRun[] = [];

  constructor(
    private readonly codes: ReadonlyMap<number, number> = new Map(),
    private readonly failure?: Error,
  ) {
    super();
  }

  async run(run: CommandRun): Promise<number> {
    this.runs.push(run);
    if (this.failure !== undefined) {
      throw this.failure;
    }
    return this.codes.get(this.runs.length) ?? 0;
  }
}
