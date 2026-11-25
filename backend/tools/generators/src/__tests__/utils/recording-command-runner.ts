import { CommandRunner, type CommandRun } from '../../command-runner.js';

/** Records each command and responds with the code requested for call number `n`, starting at 1; otherwise 0. */
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
