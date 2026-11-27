import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Runs `node --test` with a temporary folder of its own and fails the run when the tests leave anything in it, so a
 * test that forgets to remove its temporary files turns the run red instead of filling the machine's temporary folder.
 * The folder is removed after every run, whatever the outcome.
 */
export class NodeTestRun {
  static PREFIX = 'node-test-run-';
  static TEMP_VARIABLES = ['TMPDIR', 'TMP', 'TEMP'];

  /**
   * @param {string[]} patterns Test files or glob patterns, as `node --test` takes them.
   * @param {{ parent?: string, cwd?: string, output?: 'inherit' | 'ignore', log?: (line: string) => void }} [options]
   * Folder that holds the run's temporary folder (the system one by default), working directory of the tests, whether
   * their output is shown, and where the leaks are reported.
   */
  constructor(patterns, options = {}) {
    this.patterns = patterns;
    this.parent = options.parent ?? tmpdir();
    this.cwd = options.cwd ?? process.cwd();
    this.output = options.output ?? 'inherit';
    this.log = options.log ?? ((line) => console.error(line));
  }

  /**
   * Runs the tests and checks that their temporary folder is empty afterwards.
   * @returns {number} The exit code of the tests, or 1 when they passed but left files behind.
   */
  run() {
    const temp = mkdtempSync(join(this.parent, NodeTestRun.PREFIX));
    try {
      const result = spawnSync(process.execPath, ['--test', ...this.patterns], {
        cwd: this.cwd,
        env: this.environment(temp),
        stdio: this.output,
      });
      const leftovers = readdirSync(temp);
      if (leftovers.length > 0) {
        this.log(
          `The tests left files in their temporary folder; remove them in an after hook or a finally block: ${leftovers.join(', ')}`,
        );
        return 1;
      }
      return result.status ?? 1;
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }

  /**
   * The environment of the tests, with every temporary folder variable pointing to the run's folder. It drops the
   * context of an enclosing test runner, so a run started from a test reports its own exit code.
   * @param {string} temp The run's temporary folder.
   * @returns {NodeJS.ProcessEnv} The environment.
   */
  environment(temp) {
    const { NODE_TEST_CONTEXT: _enclosingRunner, ...inherited } = process.env;
    return {
      ...inherited,
      ...Object.fromEntries(
        NodeTestRun.TEMP_VARIABLES.map((name) => [name, temp]),
      ),
    };
  }
}
