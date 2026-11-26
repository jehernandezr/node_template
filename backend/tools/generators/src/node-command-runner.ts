import { spawn } from 'node:child_process';
import { CommandRunner, type CommandRun } from './command-runner.js';

/** Runs the command with the output on the console of whoever launched it. */
export class NodeCommandRunner extends CommandRunner {
  override run(run: CommandRun): Promise<number> {
    const env: NodeJS.ProcessEnv = { ...process.env, ...run.env };
    for (const name of run.unset ?? []) {
      delete env[name];
    }
    return new Promise((resolve, reject) => {
      const child = spawn(run.command, [...run.args], {
        cwd: run.cwd,
        env,
        stdio: 'inherit',
      });
      child.once('error', reject);
      child.once('close', (code) => resolve(code ?? 1));
    });
  }
}
