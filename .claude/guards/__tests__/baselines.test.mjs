import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/** A checked-in baseline compared with the same file where the branch forked from `main`. */
class ForkedBaseline {
  static BASES = ['origin/main', 'main'];

  /**
   * @param {string} file Path from the repository root.
   */
  constructor(file) {
    this.file = file;
  }

  /**
   * The baseline on the branch.
   * @returns {unknown} Its parsed JSON.
   */
  current() {
    return JSON.parse(readFileSync(join(ROOT, this.file), 'utf8'));
  }

  /**
   * The baseline at the fork point, when git can find one.
   * @returns {unknown | undefined} Its parsed JSON, or `undefined` without a base or without the file there.
   */
  forked() {
    for (const base of ForkedBaseline.BASES) {
      try {
        const fork = execFileSync('git', ['merge-base', 'HEAD', base], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        return JSON.parse(
          execFileSync('git', ['show', `${fork}:${this.file}`], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }),
        );
      } catch {
        continue;
      }
    }
    return undefined;
  }
}

describe('baselines only go down against the fork point', () => {
  it('never raises a count of the language baseline or adds a file to it', (t) => {
    const baseline = new ForkedBaseline(
      '.claude/guards/language-baseline.json',
    );
    const forked = baseline.forked();
    if (forked === undefined) return t.skip('no fork point with a baseline');
    const raised = Object.entries(baseline.current())
      .filter(([file, count]) => count > (forked[file] ?? 0))
      .map(([file, count]) => `${file}: ${count}`);
    assert.deepEqual(raised, []);
  });

  it('never adds a file to the lint baseline', (t) => {
    const baseline = new ForkedBaseline('backend/eslint.baseline.json');
    const forked = baseline.forked();
    if (forked === undefined) return t.skip('no fork point with a baseline');
    const added = Object.entries(baseline.current()).flatMap(([rule, files]) =>
      files
        .filter((file) => !(forked[rule] ?? []).includes(file))
        .map((file) => `${rule}: ${file}`),
    );
    assert.deepEqual(added, []);
  });
});
