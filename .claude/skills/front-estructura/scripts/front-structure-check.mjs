import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Baseline } from './baseline.mjs';
import { CheckMode } from './check-mode.mjs';
import { FrontPaths } from './front-paths.mjs';

export class FrontStructureCheck {
  static BASELINE_FILE = 'front/tools/structure-baseline.json';

  // mode: uno de los valores de CheckMode.
  constructor(root, mode, rules) {
    this.root = root;
    this.mode = mode;
    this.rules = rules;
  }

  // Devuelve { violations: Violation[], warnings: string[], baselineWritten: number | null }.
  run() {
    const baselinePath = join(this.root, FrontStructureCheck.BASELINE_FILE);
    if (this.mode === CheckMode.CHANGED) {
      // Un archivo tocado debe quedar limpio: la línea base no cuenta.
      return this.result(this.evaluate(this.changedFrontFiles()), [], null);
    }
    const all = this.evaluate(this.allFrontFiles());
    if (this.mode === CheckMode.UPDATE_BASELINE) {
      Baseline.fromViolations(all).save(baselinePath);
      return this.result([], [], all.length);
    }
    const { fresh, stale } = Baseline.load(baselinePath).filterNew(all);
    return this.result(
      fresh,
      stale.map((s) => `entrada de la línea base que ya no aplica: ${s}`),
      null,
    );
  }

  result(violations, warnings, baselineWritten) {
    return { violations, warnings, baselineWritten };
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
