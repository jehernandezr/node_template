import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Repositorio git temporal para probar la CLI sin tocar el repositorio real.
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

  commitAll() {
    this.git('add', '-A');
    // Sin hooks globales: el repositorio temporal no debe ejecutar los del usuario.
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

  read(relativePath) {
    return readFileSync(join(this.root, relativePath), 'utf8');
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}
