const { mkdtempSync, readdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

/**
 * The temporary folder of one Jest run of the container suites. The `globalSetup` points the temporary folder
 * variables at a new folder, which the workers inherit, and the `globalTeardown` removes it and fails the run when a
 * suite left files in it, so a suite that forgets to remove its temporary files turns the run red instead of filling
 * the machine's temporary folder.
 */
class JestTempFolder {
  static PREFIX = 'jest-run-';
  static VARIABLES = ['TMPDIR', 'TMP', 'TEMP'];
  static PREVIOUS = 'NT_JEST_PREVIOUS_TMPDIR';
  static TOOL_FILES = [/^testcontainers-node-\d+\.lock$/];

  /**
   * @param {NodeJS.ProcessEnv} env Environment the variables are written to; the workers inherit it.
   */
  constructor(env) {
    this.env = env;
  }

  /**
   * Creates the run's folder and points the temporary folder variables at it.
   * @returns {string} The folder.
   */
  open() {
    const folder = mkdtempSync(join(tmpdir(), JestTempFolder.PREFIX));
    this.env[JestTempFolder.PREVIOUS] = JSON.stringify(
      Object.fromEntries(
        JestTempFolder.VARIABLES.map((name) => [name, this.env[name] ?? null]),
      ),
    );
    for (const name of JestTempFolder.VARIABLES) this.env[name] = folder;
    return folder;
  }

  /**
   * Removes the run's folder, restores the variables and reports what the suites left in it.
   * @returns {string[]} The files the suites left behind, without the lock files of the container tooling.
   */
  close() {
    const folder = this.env.TMPDIR;
    const previous = this.env[JestTempFolder.PREVIOUS];
    if (folder === undefined || previous === undefined) return [];
    const leftovers = readdirSync(folder).filter(
      (name) => !JestTempFolder.TOOL_FILES.some((tool) => tool.test(name)),
    );
    rmSync(folder, { recursive: true, force: true });
    for (const [name, value] of Object.entries(JSON.parse(previous))) {
      if (value === null) delete this.env[name];
      else this.env[name] = value;
    }
    delete this.env[JestTempFolder.PREVIOUS];
    return leftovers;
  }

  /**
   * Like `close`, but throws when the suites left files behind, which fails the Jest run.
   * @returns {void}
   */
  closeOrFail() {
    const leftovers = this.close();
    if (leftovers.length > 0) {
      throw new Error(
        `The integration suites left files in their temporary folder; remove them in an afterAll hook: ${leftovers.join(', ')}`,
      );
    }
  }
}

module.exports = { JestTempFolder };
