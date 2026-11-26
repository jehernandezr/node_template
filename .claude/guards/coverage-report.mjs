#!/usr/bin/env node
/**
 * Collects the coverage of the container test shards and enforces it in one place.
 * Usage:
 *   node .claude/guards/coverage-report.mjs collect --projects <a,b> --out <folder> [root]
 *     copies the coverage summary of each project of a shard to <folder>/<project>.json, and fails when one is missing.
 *   node .claude/guards/coverage-report.mjs check --projects <a,b,c> --in <folder> [root]
 *     merges the summaries of every shard into one table and fails when a project has none or is under the threshold
 *     of backend/jest.preset.js.
 */
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { CoverageShards } from './coverage-shards.mjs';

/** Command line of the coverage report. */
class CoverageCommand {
  /**
   * @param {string[]} argv Arguments after the script name.
   */
  constructor(argv) {
    this.action = argv[0];
    const option = (name) => {
      const index = argv.indexOf(name);
      return index === -1 ? undefined : argv[index + 1];
    };
    this.projects = (option('--projects') ?? '').split(',').filter(Boolean);
    this.folder = option(this.action === 'collect' ? '--out' : '--in');
    const flags = new Set(['--projects', '--out', '--in']);
    const root = argv
      .slice(1)
      .find(
        (arg, index, rest) =>
          !arg.startsWith('--') && !flags.has(rest[index - 1]),
      );
    this.root = resolve(root ?? '.');
  }

  /**
   * Runs the action and prints its outcome.
   * @returns {Promise<number>} The exit code.
   */
  async run() {
    const report = new CoverageShards(this.root);
    if (this.action === 'collect') {
      const missing = report.collect(this.projects, resolve(this.folder));
      if (missing.length === 0) return 0;
      console.error(`No coverage summary for: ${missing.join(', ')}`);
      return 1;
    }
    if (this.action === 'check') {
      const preset = await import(
        pathToFileURL(join(this.root, 'backend/jest.preset.js')).href
      );
      const outcome = report.check(
        this.projects,
        resolve(this.folder),
        preset.default.coverageThreshold.global,
      );
      console.log(outcome.table);
      if (outcome.failures.length === 0) return 0;
      console.error(outcome.failures.join('\n'));
      return 1;
    }
    console.error(`Unknown action ${this.action}: use collect or check`);
    return 2;
  }
}

process.exitCode = await new CoverageCommand(process.argv.slice(2)).run();
