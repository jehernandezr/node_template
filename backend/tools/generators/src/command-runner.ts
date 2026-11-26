/** A system command run by the generators smoke test. */
export interface CommandRun {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  /** Variables added to those of the process. */
  readonly env?: Readonly<Record<string, string>>;
  /** Process variables the command does not inherit. */
  readonly unset?: readonly string[];
}

/** Runs system commands, to test the smoke test without launching processes. */
export abstract class CommandRunner {
  /**
   * Runs a command and waits for it to end.
   * @returns the command exit code.
   * @param run Command, arguments and folder.
   */
  abstract run(run: CommandRun): Promise<number>;
}
