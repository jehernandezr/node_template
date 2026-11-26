import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CheckMode } from './check-mode.mjs';
import { FrontPaths } from './front-paths.mjs';

/** Runs the front rules over the files of a check mode and collects their violations. */
export class FrontStructureCheck {
  /**
   * @param {string} root Repository root.
   * @param {string} mode One of the `CheckMode` values.
   * @param {import('./rules/rule.mjs').Rule[]} rules Rules to run.
   */
  constructor(root, mode, rules) {
    this.root = root;
    this.mode = mode;
    this.rules = rules;
  }

  /**
   * Checks the files of the mode: those changed against HEAD with `CHANGED`, all of `front/` with `ALL`. Generated
   * files are skipped by their path.
   * @returns {{ violations: import('./violation.mjs').Violation[] }} Every violation found.
   */
  run() {
    const files =
      this.mode === CheckMode.ALL
        ? this.#allFrontFiles()
        : this.#changedFrontFiles();
    return { violations: this.#evaluate(files) };
  }

  /**
   * Runs every rule that applies to each file, skipping generated files.
   * @param {string[]} files Paths from the repository root.
   * @returns {import('./violation.mjs').Violation[]} Every violation found.
   */
  #evaluate(files) {
    const violations = [];
    for (const file of files) {
      if (FrontPaths.isGenerated(file)) continue;
      const applicable = this.rules.filter((rule) => rule.appliesTo(file));
      if (applicable.length === 0) continue;
      const text = this.#readText(file);
      for (const rule of applicable) violations.push(...rule.check(file, text));
    }
    return violations;
  }

  /**
   * Reads the files the rules inspect as text; other files reach the rules empty.
   * @param {string} file Path from the repository root.
   * @returns {string} The Dart source or `pubspec.yaml`, or an empty string.
   */
  #readText(file) {
    const isText = FrontPaths.isDart(file) || file.endsWith('/pubspec.yaml');
    return isText ? readFileSync(join(this.root, file), 'utf8') : '';
  }

  /**
   * Front files changed against `HEAD` or not yet tracked, which still exist.
   * @returns {string[]} Paths from the repository root.
   */
  #changedFrontFiles() {
    const changed = new Set([
      ...this.#git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
      ...this.#git(['ls-files', '--others', '--exclude-standard']),
    ]);
    return [...changed].filter(
      (f) => f.startsWith('front/') && existsSync(join(this.root, f)),
    );
  }

  /**
   * Every tracked or new front file; ignored artifacts do not count as code.
   * @returns {string[]} Paths from the repository root.
   */
  #allFrontFiles() {
    return this.#git([
      'ls-files',
      '-co',
      '--exclude-standard',
      'front/',
    ]).filter((f) => existsSync(join(this.root, f)));
  }

  /**
   * Runs git in the repository and splits its output into lines.
   * @param {string[]} args Git arguments.
   * @returns {string[]} The non-empty output lines.
   */
  #git(args) {
    return execFileSync('git', args, { cwd: this.root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
}
