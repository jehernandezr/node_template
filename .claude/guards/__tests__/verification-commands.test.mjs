import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const JEST_TARGETS = new Set(['test', 'test-int']);

/** The Nx commands a text tells a reader to run, with the targets each one names. */
class NxCommandList {
  /**
   * @param {string} text Text that holds the commands.
   */
  constructor(text) {
    this.text = text;
  }

  /**
   * Every `nx run-many` or `nx affected` command of the text.
   * @returns {{ command: string, targets: string[] }[]} The commands and their targets.
   */
  commands() {
    return [
      ...this.text.matchAll(
        /nx (?:run-many|affected) (?:(?!nx (?:run-many|affected))[^\n`()])*/g,
      ),
    ].map(([command]) => ({ command, targets: this.targets(command) }));
  }

  /**
   * Targets named after `-t` or `--targets`.
   * @param {string} command One command line.
   * @returns {string[]} The target names.
   */
  targets(command) {
    const tokens = command.split(/\s+/);
    const start = tokens.findIndex(
      (token) => token === '-t' || token === '--targets',
    );
    if (start === -1) return [];
    const names = [];
    for (const token of tokens.slice(start + 1)) {
      if (token.startsWith('-')) break;
      names.push(...token.split(',').filter(Boolean));
    }
    return names;
  }
}

describe('verification commands', () => {
  it('gives --coverage only to commands whose targets all run Jest', () => {
    const workflow = new NxCommandList(
      readFileSync(join(ROOT, '.claude/workflows/phase-cycle.js'), 'utf8'),
    );
    const mixed = workflow
      .commands()
      .filter(({ command }) => command.includes('--coverage'))
      .filter(({ targets }) => targets.some((name) => !JEST_TARGETS.has(name)))
      .map(({ command }) => command);
    assert.deepEqual(
      mixed,
      [],
      'Nx forwards --coverage to every target, and tsc and eslint reject it',
    );
  });

  it('flags a command that mixes --coverage with lint', () => {
    const [command] = new NxCommandList(
      'pnpm nx run-many -t lint typecheck test-int --coverage',
    ).commands();
    assert.deepEqual(command.targets, ['lint', 'typecheck', 'test-int']);
  });
});
