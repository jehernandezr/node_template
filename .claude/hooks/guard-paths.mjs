#!/usr/bin/env node
// PreToolUse de Write y Edit: rechaza escrituras que violan la estructura del repositorio
// antes de que ocurran. Sale con 2 y el motivo en stderr para que el agente corrija.
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

class PathGuard {
  static RULES = [
    {
      test: (p) => /^backend\/(libs|apps|tools)\/.+\/src\/lib\//.test(p),
      reason:
        'El código del backend va directo en src/, sin src/lib/ (skill backend-estructura).',
    },
    {
      test: (p) =>
        /^backend\/.+\.(int-)?spec\.ts$/.test(p) &&
        !/\/(__tests__|e2e)\//.test(p),
      reason:
        'Las pruebas del backend van en la carpeta __tests__/ de la carpeta que prueban (skill backend-pruebas).',
    },
    {
      test: (p, isNew) => isNew && /^backend\/libs\/.+\/package\.json$/.test(p),
      reason:
        'Las librerías del backend no tienen package.json: se importan por alias de TypeScript (skill backend-estructura).',
    },
    {
      test: (p) => /^backend\/(libs|apps|tools)\/.+\/dist\//.test(p),
      reason:
        'El compilado de cada app va en backend/dist/<app>, nunca dentro de un proyecto (skill backend-estructura).',
    },
    {
      test: (p) => /^front\/.+\/lib\/.+_test\.dart$/.test(p),
      reason:
        'Las pruebas del front van en el test/ del paquete, con las carpetas de lib/src (skill front-pruebas).',
    },
    {
      test: (p) =>
        /^front\/packages\/contracts\/lib\/src\/(?!core\/)/.test(p) ||
        /\/l10n\/generated\//.test(p),
      reason:
        'Es código generado: cambia la fuente y regenera con contracts_gen o flutter gen-l10n.',
    },
    {
      test: (p) =>
        /(^|\/)\.env(\.[\w-]+)?$/.test(p) && !p.endsWith('.env.example'),
      reason:
        'Nunca se escribe un .env: documenta las variables en .env.example.',
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
