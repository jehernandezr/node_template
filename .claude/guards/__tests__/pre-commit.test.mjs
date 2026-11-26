import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const CONFIG = await import(
  pathToFileURL(join(ROOT, 'lint-staged.config.mjs')).href
);

/** Every command lint-staged would run for a set of staged files. */
class StagedCommands {
  /**
   * @param {Record<string, string | ((files: string[]) => string[])>} config The lint-staged config.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * The commands of every glob, given the same staged files.
   * @param {string[]} files Staged files.
   * @returns {string[]} The commands.
   */
  for(files) {
    return Object.values(this.config).flatMap((task) =>
      typeof task === 'function' ? task(files) : [task],
    );
  }
}

describe('pre-commit', () => {
  const files = [
    '/repo/backend/apps/a/src/a.ts',
    '/repo/.claude/guards/x.mjs',
    '/repo/docs/a.md',
  ];
  const commands = new StagedCommands(CONFIG.default).for(files);

  it('runs every command on the staged files only', () => {
    const wide = commands.filter(
      (command) =>
        !command.includes('--staged') &&
        !files.some((file) => command.includes(file)) &&
        command !== 'dart format',
    );
    assert.deepEqual(wide, []);
  });

  it('leaves Nx, whole-repository modes and tests to CI and the workflow gate', () => {
    assert.deepEqual(
      commands.filter((command) =>
        /\bnx\b|--all\b|--changed\b|node --test|\bjest\b/.test(command),
      ),
      [],
    );
  });
});
