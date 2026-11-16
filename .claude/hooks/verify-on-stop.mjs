#!/usr/bin/env node
// Stop y SubagentStop: antes de que un agente termine, revisa los archivos que cambió con los
// scripts de las skills de estructura. Si hay violaciones, sale con 2 y el agente sigue
// trabajando con la lista en stderr. Una segunda parada seguida se deja pasar para no entrar
// en un ciclo; la violación queda reportada y CI la vuelve a atrapar.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

class StopVerifier {
  static CHECKS = [
    '.claude/skills/backend-estructura/scripts/check-structure.mjs',
    '.claude/skills/front-estructura/scripts/check-structure.mjs',
  ];

  constructor(input) {
    this.input = input;
  }

  run() {
    if (this.input.stop_hook_active) return 0;
    const root = this.repositoryRoot(this.input.cwd ?? process.cwd());
    if (!root) return 0;
    const failures = StopVerifier.CHECKS.map((check) => join(root, check))
      .filter((script) => existsSync(script))
      .map((script) =>
        spawnSync(process.execPath, [script, '--changed', root], {
          encoding: 'utf8',
        }),
      )
      .filter((result) => result.status !== 0)
      .map((result) => result.stderr.trim());
    if (failures.length === 0) return 0;
    console.error(
      `${failures.join('\n\n')}\n\nCorrige estas violaciones antes de terminar.`,
    );
    return 2;
  }

  repositoryRoot(cwd) {
    try {
      return execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd,
        encoding: 'utf8',
      }).trim();
    } catch {
      return null;
    }
  }
}

process.exit(
  new StopVerifier(JSON.parse(readFileSync(0, 'utf8') || '{}')).run(),
);
