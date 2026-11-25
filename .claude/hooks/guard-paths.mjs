#!/usr/bin/env node
// PreToolUse for Write and Edit: rejects writes that break the repository structure before
// they happen. Exits with 2 and the reason on stderr so the agent can fix it.
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

class PathGuard {
  static RULES = [
    {
      test: (p) => /^backend\/(libs|apps|tools)\/.+\/src\/lib\//.test(p),
      reason:
        'Backend code goes directly in src/, without src/lib/ (skill backend-estructura).',
    },
    {
      test: (p) =>
        /^backend\/.+\.(int-)?spec\.ts$/.test(p) &&
        !/\/(__tests__|e2e)\//.test(p),
      reason:
        'Backend tests go in the __tests__/ folder of the folder they test (skill backend-pruebas).',
    },
    {
      test: (p, isNew) => isNew && /^backend\/libs\/.+\/package\.json$/.test(p),
      reason:
        'Backend libraries have no package.json: they are imported through TypeScript aliases (skill backend-estructura).',
    },
    {
      test: (p) =>
        /^backend\/(libs|apps|tools)\/.+\/src\/(.+\/)?(testing|test|support)\//.test(
          p,
        ) && !/\/__tests__\//.test(p),
      reason:
        'Test utilities go in __tests__/utils, not in a separate testing folder (skill backend-pruebas).',
    },
    {
      test: (p) => /^backend\/(libs|apps|tools)\/.+\/dist\//.test(p),
      reason:
        'Each app builds into backend/dist/<app>, never inside a project (skill backend-estructura).',
    },
    {
      test: (p) =>
        /^front\/.+\/test\/(.+\/)?(support|testing|helpers)\//.test(p),
      reason:
        'Code shared by the tests of a front package goes in test/utils/ (skill front-pruebas).',
    },
    {
      test: (p) => /^front\/.+\/lib\/.+_test\.dart$/.test(p),
      reason:
        'Front tests go in the package test/, mirroring the lib/src folders (skill front-pruebas).',
    },
    {
      test: (p) =>
        /^front\/packages\/contracts\/lib\/src\/(?!core\/)/.test(p) ||
        /\/l10n\/generated\//.test(p),
      reason:
        'This is generated code: change the source and regenerate with contracts_gen or flutter gen-l10n.',
    },
    {
      test: (p) =>
        /(^|\/)\.env(\.[\w-]+)?$/.test(p) && !p.endsWith('.env.example'),
      reason: 'Never write a .env: document the variables in .env.example.',
    },
  ];

  constructor(input) {
    this.input = input;
  }

  check() {
    const target =
      this.input.tool_input?.file_path ?? this.input.tool_input?.notebook_path;
    if (!target) return null;
    const cwd = this.input.cwd ?? process.cwd();
    const absolute = isAbsolute(target) ? target : resolve(cwd, target);
    const root = this.repositoryRoot(cwd);
    const path = relative(root, absolute).split(sep).join('/');
    if (path.startsWith('..')) return null;
    const isNew = !existsSync(absolute);
    return (
      PathGuard.RULES.find((rule) => rule.test(path, isNew))?.reason ?? null
    );
  }

  repositoryRoot(cwd) {
    try {
      return execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd,
        encoding: 'utf8',
      }).trim();
    } catch {
      return cwd;
    }
  }
}

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const reason = new PathGuard(input).check();
if (reason) {
  console.error(reason);
  process.exit(2);
}
