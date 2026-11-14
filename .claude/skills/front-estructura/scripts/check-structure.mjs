#!/usr/bin/env node
// Verifica las reglas de front-estructura, front-codigo y front-pruebas.
// Uso: node check-structure.mjs [--all | --changed] [raíz del repositorio]
//   --changed (por defecto) revisa solo los archivos cambiados frente a HEAD, incluidos los nuevos.
//   --all revisa todo front/.
// Sale con código 1 y la lista de violaciones si encuentra alguna.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

class FrontStructureCheck {
  static IGNORED_DIRS = new Set([
    '.dart_tool',
    'build',
    '.git',
    'node_modules',
    'ios',
    'android',
    'macos',
    'linux',
    'windows',
  ]);
  static GENERATED = /\/(l10n\/generated|contracts\/lib\/src\/(?!core\/))/;
  // Una declaración en la columna 0 que no es final ni const: los miembros de clase van indentados.
  static TOP_LEVEL_MUTABLE =
    /^(?!final\b|const\b|typedef\b|import\b|export\b|part\b|library\b|return\b)(var\s+\w+|late\s+\S+|[A-Za-z_]\w*(<[^>\n]*>)?\??\s+_?\w+\s*=(?![=>]))/m;

  constructor(root, mode) {
    this.root = root;
    this.mode = mode;
    this.violations = [];
  }

  run() {
    const files =
      this.mode === '--all' ? this.allFrontFiles() : this.changedFrontFiles();
    for (const file of files) this.checkFile(file);
    return this.violations;
  }

  changedFrontFiles() {
    const git = (args) =>
      execFileSync('git', args, { cwd: this.root, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    const changed = new Set([
      ...git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]);
    return [...changed].filter(
      (f) => f.startsWith('front/') && existsSync(join(this.root, f)),
    );
  }

  allFrontFiles() {
    // Solo archivos versionados o nuevos: los artefactos ignorados no cuentan como código.
    return execFileSync(
      'git',
      ['ls-files', '-co', '--exclude-standard', 'front/'],
      { cwd: this.root, encoding: 'utf8' },
    )
      .split('\n')
      .filter((f) => f && existsSync(join(this.root, f)));
  }

  checkFile(file) {
    if (!file.endsWith('.dart')) return;
    const inLib = /\/lib\//.test(file);
    if (inLib && file.endsWith('_test.dart')) {
      this.add(
        file,
        'las pruebas van en el test/ del paquete, con las carpetas de lib/src',
      );
    }
    if (!inLib || FrontStructureCheck.GENERATED.test(file)) return;
    const text = readFileSync(join(this.root, file), 'utf8');
    const isTestingSupport = /\/lib\/(testing\.dart|src\/testing\/)/.test(file);
    if (!isTestingSupport && /import\s+'package:flutter_test\//.test(text)) {
      this.add(
        file,
        'lib/ no importa flutter_test; los dobles compartidos van en lib/testing.dart',
      );
    }
    if (/\bDateTime\.now\(\)/.test(text) && !/clock/i.test(file)) {
      this.add(
        file,
        'el tiempo se inyecta con un Clock; nada de DateTime.now() en la lógica',
      );
    }
    if (/^\s*print\(/m.test(text)) {
      this.add(
        file,
        'sin print(): los fallos se reportan por el canal de errores del shell',
      );
    }
    if (FrontStructureCheck.TOP_LEVEL_MUTABLE.test(text)) {
      this.add(file, 'sin estado mutable en variables de nivel superior');
    }
  }

  add(file, rule) {
    this.violations.push(`${file}: ${rule}`);
  }
}

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith('--')) ?? '--changed';
const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
const violations = new FrontStructureCheck(root, mode).run();
if (violations.length > 0) {
  console.error(
    `Reglas del front incumplidas (${violations.length}):\n- ${violations.join('\n- ')}`,
  );
  process.exit(1);
}
