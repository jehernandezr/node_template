import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, matchesGlob, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GateCommand } from '../gate-command.mjs';
import { GuardGate } from '../guard-gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Lists the tool tests under a folder of the repository. */
class ToolTestFiles {
  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * Every `*.test.mjs` under the folder, relative to the root.
   * @param {string} folder Folder to walk, relative to the root.
   * @returns {string[]} The test files.
   */
  under(folder) {
    return readdirSync(join(this.root, folder), {
      recursive: true,
      withFileTypes: true,
    })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith('.test.mjs') &&
          !entry.parentPath.includes('node_modules'),
      )
      .map((entry) => relative(this.root, join(entry.parentPath, entry.name)));
  }
}

/** Records the steps the gate runs and fails the ones it is told to. */
class ScriptedRunner {
  constructor(failing) {
    this.failing = new Set(failing);
    this.ran = [];
  }

  /**
   * Pretends to run a step.
   * @param {import('../guard-gate.mjs').GateStep} step Step of the gate.
   * @returns {{ status: number, output: string }} A failure for the scripted names.
   */
  run(step) {
    this.ran.push(step.name);
    return this.failing.has(step.name)
      ? { status: 1, output: `${step.name} failed` }
      : { status: 0, output: '' };
  }
}

describe('GuardGate', () => {
  it('runs every guard even after one fails and reports each red one', () => {
    const runner = new ScriptedRunner(['language', 'format']);
    const gate = new GuardGate('/repo', 'main', (step) => runner.run(step));

    const outcome = gate.check();

    assert.equal(outcome.passed, false);
    assert.deepEqual(
      outcome.failed.map((step) => step.name),
      ['language', 'format'],
    );
    assert.equal(runner.ran.length, gate.steps().length);
  });

  it('is green when every guard passes', () => {
    const runner = new ScriptedRunner([]);
    assert.equal(
      new GuardGate('/repo', 'main', (step) => runner.run(step)).check().passed,
      true,
    );
  });

  it('lints the projects affected since the base the cycle forked from', () => {
    const lint = new GuardGate('/repo', 'origin/main')
      .steps()
      .find((step) => step.name === 'lint of the affected projects');
    assert.ok(lint.args.includes('--base=origin/main'));
  });

  it('runs every tool test under .claude', () => {
    const missing = new ToolTestFiles(ROOT)
      .under('.claude')
      .filter(
        (file) => !GuardGate.TOOL_TESTS.some((glob) => matchesGlob(file, glob)),
      );
    assert.deepEqual(missing, [], 'add their folder to GuardGate.TOOL_TESTS');
  });

  it('gives the CI tooling-test target the same tool tests as the gate', () => {
    const command = JSON.parse(
      readFileSync(join(ROOT, 'backend/package.json'), 'utf8'),
    ).nx.targets['tooling-test'].options.command;
    assert.deepEqual(
      command.split(' ').filter((part) => part.endsWith('.test.mjs')),
      GuardGate.TOOL_TESTS,
    );
  });
});

describe('GateCommand', () => {
  it('reads the root when it is the only argument', () => {
    const command = new GateCommand(['/some/root']);
    assert.equal(command.root, '/some/root');
    assert.equal(command.base, GateCommand.DEFAULT_BASE);
  });

  it('reads the base and the root in either order', () => {
    for (const argv of [
      ['--base', 'origin/main', '/some/root'],
      ['/some/root', '--base', 'origin/main'],
    ]) {
      const command = new GateCommand(argv);
      assert.deepEqual(
        { base: command.base, root: command.root },
        { base: 'origin/main', root: '/some/root' },
      );
    }
  });

  it('runs on the current folder without arguments', () => {
    assert.equal(new GateCommand([]).root, resolve('.'));
  });
});
