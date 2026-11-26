import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { CoverageShards } from '../coverage-shards.mjs';

const THRESHOLD = { lines: 80, statements: 80, functions: 80, branches: 75 };

/** A git repository with backend projects and the coverage summaries their tests left. */
class CoverageFixture {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), 'coverage-'));
    execFileSync('git', ['init', '-q'], { cwd: this.root });
  }

  /**
   * Adds a project and, when given, the summary its coverage run wrote.
   * @param {string} name Project name.
   * @param {string} folder Project root from the repository root.
   * @param {number} [pct] Percentage of every metric; no summary when absent.
   * @returns {CoverageFixture} This fixture.
   */
  project(name, folder, pct) {
    this.write(join(folder, 'project.json'), JSON.stringify({ name }));
    if (pct !== undefined) {
      const metric = { pct };
      this.write(
        join(folder, CoverageShards.SUMMARY),
        JSON.stringify({
          total: {
            lines: metric,
            statements: metric,
            functions: metric,
            branches: metric,
          },
        }),
      );
    }
    execFileSync('git', ['add', '-A'], { cwd: this.root });
    return this;
  }

  /**
   * Writes a file.
   * @param {string} file Path from the root.
   * @param {string} text Content.
   */
  write(file, text) {
    mkdirSync(dirname(join(this.root, file)), { recursive: true });
    writeFileSync(join(this.root, file), text);
  }

  /** Removes the repository. */
  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

describe('CoverageShards', () => {
  const fixture = new CoverageFixture()
    .project('tasks', 'backend/apps/tasks', 91)
    .project('billing', 'backend/apps/billing', 70)
    .project('reports', 'backend/apps/reports');
  const shards = new CoverageShards(fixture.root);
  const out = join(fixture.root, 'out');
  after(() => fixture.dispose());

  it('copies the summary of each project of a shard and names the ones without one', () => {
    const missing = shards.collect(['tasks', 'billing', 'reports'], out);

    assert.deepEqual(missing, ['reports']);
    assert.ok(existsSync(join(out, 'tasks.json')));
    assert.ok(existsSync(join(out, 'billing.json')));
  });

  it('fails a project under the threshold and one that no shard covered', () => {
    shards.collect(['tasks', 'billing'], out);

    const { failures } = shards.check(
      ['tasks', 'billing', 'notifications'],
      out,
      THRESHOLD,
    );

    assert.deepEqual(failures, [
      'billing: lines 70% is under 80%',
      'billing: statements 70% is under 80%',
      'billing: functions 70% is under 80%',
      'billing: branches 70% is under 75%',
      'notifications: no coverage from any shard',
    ]);
  });

  it('passes when every project of every shard meets the threshold', () => {
    assert.deepEqual(shards.check(['tasks'], out, THRESHOLD).failures, []);
  });
});
