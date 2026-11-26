import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const JEST_TARGETS = new Set(['test', 'test-int']);
const LIVE_DOCS = [
  'CLAUDE.md',
  'README.md',
  'CONTRIBUTING.md',
  ...['docs', 'docs/plan', '.claude/agents'].flatMap((folder) =>
    readdirSync(join(ROOT, folder))
      .filter((name) => name.endsWith('.md'))
      .map((name) => `${folder}/${name}`),
  ),
  ...readdirSync(join(ROOT, '.claude/skills'), { recursive: true })
    .filter((name) => name.endsWith('.md'))
    .map((name) => `.claude/skills/${name}`),
];
const CI_OR_INTEGRATION = /\bCI\b|integration|INTEGRATION_TESTS|coverage/i;

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

  it('never presents the unit test target alone as the CI, coverage or integration run', () => {
    const stale = LIVE_DOCS.flatMap((file) =>
      readFileSync(join(ROOT, file), 'utf8')
        .split('\n')
        .map((line, index) => ({ line, at: `${file}:${index + 1}` }))
        .filter(({ line }) => CI_OR_INTEGRATION.test(line))
        .filter(({ line }) => {
          const targets = new NxCommandList(line)
            .commands()
            .flatMap((command) => command.targets);
          return targets.includes('test') && !targets.includes('test-int');
        })
        .map(({ at }) => at),
    );
    assert.deepEqual(
      stale,
      [],
      'test runs only the unit tests; the container suites and coverage run in test-int',
    );
  });

  it('flags a command that mixes --coverage with lint', () => {
    const [command] = new NxCommandList(
      'pnpm nx run-many -t lint typecheck test-int --coverage',
    ).commands();
    assert.deepEqual(command.targets, ['lint', 'typecheck', 'test-int']);
  });
});
