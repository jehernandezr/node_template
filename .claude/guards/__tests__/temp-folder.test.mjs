import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { NodeTestRun } from '../node-test-run.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const LEAKING_TEST = `import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
it('forgets its file', () => writeFileSync(join(tmpdir(), 'forgotten.txt'), 'x'));
`;

const CLEAN_TEST = `import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
it('removes its folder', () => rmSync(mkdtempSync(join(tmpdir(), 'clean-')), { recursive: true }));
`;

const FAILING_TEST = `import { it } from 'node:test';
it('fails', () => { throw new Error('red'); });
`;

/** A folder with test files and a parent for the runs' temporary folders. */
class RunFixture {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), 'node-test-run-fixture-'));
    this.parent = join(this.root, 'runs');
    mkdirSync(this.parent);
    this.lines = [];
  }

  /**
   * Writes a test file and runs it.
   * @param {string} name File name.
   * @param {string} source Test source.
   * @returns {number} Exit code of the run.
   */
  run(name, source) {
    writeFileSync(join(this.root, name), source);
    return new NodeTestRun([name], {
      parent: this.parent,
      cwd: this.root,
      output: 'ignore',
      log: (line) => this.lines.push(line),
    }).run();
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

describe('NodeTestRun', () => {
  const fixture = new RunFixture();
  after(() => fixture.dispose());

  it('fails a passing run that leaves a file in its temporary folder and names it', () => {
    assert.equal(fixture.run('leaks.test.mjs', LEAKING_TEST), 1);
    assert.match(fixture.lines.join('\n'), /forgotten\.txt/);
  });

  it('passes a run that removes what it creates', () => {
    assert.equal(fixture.run('clean.test.mjs', CLEAN_TEST), 0);
  });

  it('keeps the exit code of failing tests', () => {
    assert.notEqual(fixture.run('fails.test.mjs', FAILING_TEST), 0);
  });

  it('removes its temporary folder after every run', () => {
    fixture.run('leaks.test.mjs', LEAKING_TEST);
    assert.deepEqual(readdirSync(fixture.parent), []);
  });
});

describe('the Nx configuration', () => {
  it('keeps the daemon off, since it installs the latest Nx in the temporary folder and leaves it there', () => {
    const nx = JSON.parse(readFileSync(join(ROOT, 'nx.json'), 'utf8'));
    assert.equal(nx.useDaemonProcess, false);
  });
});
