import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CheckMode } from './check-mode.mjs';
import { FrontPaths } from './front-paths.mjs';

export class FrontStructureCheck {
  // mode: uno de los valores de CheckMode.
  constructor(root, mode, rules) {
    this.root = root;
    this.mode = mode;
    this.rules = rules;
  }

  // Devuelve { violations: Violation[] } con todas las violaciones de los archivos del modo:
  // los cambiados frente a HEAD en CHANGED y todo front/ en ALL.
  run() {
    const files =
      this.mode === CheckMode.ALL
        ? this.allFrontFiles()
        : this.changedFrontFiles();
    return { violations: this.evaluate(files) };
  }

  evaluate(files) {
    const violations = [];
    for (const file of files) {
      if (FrontPaths.isGenerated(file)) continue;
      const applicable = this.rules.filter((rule) => rule.appliesTo(file));
      if (applicable.length === 0) continue;
      const text = this.readText(file);
      for (const rule of applicable) violations.push(...rule.check(file, text));
    }
    return violations;
  }

  readText(file) {
    const isText = FrontPaths.isDart(file) || file.endsWith('/pubspec.yaml');
    return isText ? readFileSync(join(this.root, file), 'utf8') : '';
  }

  changedFrontFiles() {
    const changed = new Set([
      ...this.git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
      ...this.git(['ls-files', '--others', '--exclude-standard']),
    ]);
    return [...changed].filter(
      (f) => f.startsWith('front/') && existsSync(join(this.root, f)),
    );
  }

  // Solo archivos versionados o nuevos: los artefactos ignorados no cuentan como código.
  allFrontFiles() {
    return this.git(['ls-files', '-co', '--exclude-standard', 'front/']).filter(
      (f) => existsSync(join(this.root, f)),
    );
  }

  git(args) {
    return execFileSync('git', args, { cwd: this.root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
}
