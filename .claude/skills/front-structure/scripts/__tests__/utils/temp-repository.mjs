import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Temporary git repository to test the CLI without touching the real repository. */
export class TempRepository {
  static CHECK_SCRIPT = fileURLToPath(
    new URL('../../check-structure.mjs', import.meta.url),
  );

  constructor() {
    this.root = mkdtempSync(join(tmpdir(), 'structure-'));
    this.git('-c', 'init.defaultBranch=main', 'init', '-q');
  }

  git(...args) {
    return execFileSync('git', args, { cwd: this.root, stdio: 'pipe' });
  }

  write(relativePath, content) {
    mkdirSync(dirname(join(this.root, relativePath)), { recursive: true });
    writeFileSync(join(this.root, relativePath), content);
  }

  /** Commits everything with no hooks at all: the temporary repository must not run the user's global hooks. */
  commitAll() {
    this.git('add', '-A');
    this.git(
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-q',
      '-m',
      'init',
      '--allow-empty',
    );
  }

  runCheck(...args) {
    const result = spawnSync(
      process.execPath,
      [TempRepository.CHECK_SCRIPT, ...args, this.root],
      {
        encoding: 'utf8',
      },
    );
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}
