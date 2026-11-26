#!/usr/bin/env node
/**
 * Stop and SubagentStop: before an agent finishes, checks the files it changed with the
 * structure skill scripts. On violations it exits with 2 and the agent keeps working with the
 * list on stderr. A second stop in a row is let through to avoid a loop; the violation stays
 * reported and CI catches it again.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

class StopVerifier {
  static CHECKS = [
    '.claude/skills/backend-structure/scripts/check-structure.mjs',
    '.claude/skills/front-structure/scripts/check-structure.mjs',
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
      `${failures.join('\n\n')}\n\nFix these violations before finishing.`,
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
