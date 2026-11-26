import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** @typedef {{ lines: number, statements: number, functions: number, branches: number }} CoverageThreshold */

/**
 * The coverage of the container test shards: each shard copies the summary Jest wrote for each of its projects, and
 * one job reads every copy, so a project missing from every shard or under the threshold fails in one place.
 */
export class CoverageShards {
  static SUMMARY = 'test-output/jest/coverage/coverage-summary.json';
  static METRICS = ['lines', 'statements', 'functions', 'branches'];

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * Copies the coverage summary of each project to the folder, named after the project.
   * @param {string[]} projects Nx projects of the shard.
   * @param {string} out Folder the copies go to.
   * @returns {string[]} The projects without a summary.
   */
  collect(projects, out) {
    mkdirSync(out, { recursive: true });
    const roots = this.projectRoots();
    const missing = [];
    for (const project of projects) {
      const summary = join(
        this.root,
        roots.get(project) ?? '',
        CoverageShards.SUMMARY,
      );
      if (!roots.has(project) || !existsSync(summary)) {
        missing.push(project);
        continue;
      }
      copyFileSync(summary, join(out, `${project}.json`));
    }
    return missing;
  }

  /**
   * Reads the summaries of every shard and compares each project with the threshold.
   * @param {string[]} projects Every project the shards had to cover.
   * @param {string} folder Folder with the copied summaries of all shards.
   * @param {CoverageThreshold} threshold Minimum percentage per metric.
   * @returns {{ table: string, failures: string[] }} One line per project, and what failed.
   */
  check(projects, folder, threshold) {
    const failures = [];
    const lines = [`Coverage (${CoverageShards.METRICS.join(' / ')})`];
    for (const project of [...projects].sort()) {
      const file = join(folder, `${project}.json`);
      if (!existsSync(file)) {
        failures.push(`${project}: no coverage from any shard`);
        continue;
      }
      const total = JSON.parse(readFileSync(file, 'utf8')).total;
      const values = CoverageShards.METRICS.map((metric) => total[metric].pct);
      lines.push(`${project}: ${values.join(' / ')}`);
      for (const [index, metric] of CoverageShards.METRICS.entries()) {
        if (values[index] < threshold[metric]) {
          failures.push(
            `${project}: ${metric} ${values[index]}% is under ${threshold[metric]}%`,
          );
        }
      }
    }
    return { table: lines.join('\n'), failures };
  }

  /**
   * The root of every backend Nx project, by name.
   * @returns {Map<string, string>} Project name to its folder from the repository root.
   */
  projectRoots() {
    const files = execFileSync('git', ['ls-files', 'backend/**/project.json'], {
      cwd: this.root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
    return new Map(
      files.map((file) => [
        JSON.parse(readFileSync(join(this.root, file), 'utf8')).name,
        dirname(file),
      ]),
    );
  }
}
