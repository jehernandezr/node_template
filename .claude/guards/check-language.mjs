#!/usr/bin/env node
/**
 * Checks that developer text is English.
 * Usage: node check-language.mjs [--changed | --all | --staged | --files <file...> | --commit-msg <file>] [root]
 *   --changed (default) checks the files changed against HEAD, including new ones.
 *   --all checks every tracked and new file and the baseline itself.
 *   --staged checks the files staged for the next commit.
 *   --files checks the given files; --commit-msg checks a commit message file.
 *   --update-baseline records the current counts in .claude/guards/language-baseline.json.
 * Exits with 1 and the list of findings when it finds any, and with 2 on an unknown mode.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { LanguageBaseline } from './language-baseline.mjs';
import { LanguageCheck } from './language-check.mjs';

/** Command line of the language check: picks the files of each mode and prints the findings. */
class LanguageCommand {
  static BASELINE = '.claude/guards/language-baseline.json';
  static MODES = new Set([
    '--changed',
    '--all',
    '--staged',
    '--files',
    '--commit-msg',
    '--update-baseline',
  ]);

  /**
   * @param {string[]} argv Arguments after the script name.
   * @param {string} cwd Directory the command runs from.
   */
  constructor(argv, cwd) {
    this.mode = argv[0]?.startsWith('--') ? argv[0] : '--changed';
    this.rest = argv[0]?.startsWith('--') ? argv.slice(1) : argv;
    this.cwd = cwd;
  }

  /**
   * Runs the mode and reports.
   * @returns {number} The exit code.
   */
  run() {
    if (!LanguageCommand.MODES.has(this.mode)) {
      console.error(`Unknown mode ${this.mode}`);
      return 2;
    }
    const root = this.root();
    const baselinePath = join(root, LanguageCommand.BASELINE);
    const check = new LanguageCheck(root, LanguageBaseline.read(baselinePath));
    if (this.mode === '--update-baseline') {
      LanguageBaseline.write(baselinePath, check.count(this.all(root)));
      return 0;
    }
    const findings =
      this.mode === '--commit-msg'
        ? check.checkMessage(
            readFileSync(resolve(this.cwd, this.rest[0]), 'utf8'),
          )
        : check.checkFiles(this.files(root), this.mode === '--all');
    if (findings.length === 0) return 0;
    console.error(
      `Language check (${findings.length}):\n${findings.map((finding) => `  ${finding}`).join('\n')}`,
    );
    return 1;
  }

  /**
   * The repository root: the given one, or the top level of the git work tree.
   * @returns {string} Absolute path.
   */
  root() {
    if (
      this.mode !== '--files' &&
      this.mode !== '--commit-msg' &&
      this.rest[0]
    ) {
      return resolve(this.cwd, this.rest[0]);
    }
    return this.git(this.cwd, ['rev-parse', '--show-toplevel'])[0] ?? this.cwd;
  }

  /**
   * Files of the mode, from the repository root.
   * @param {string} root Repository root.
   * @returns {string[]} The paths.
   */
  files(root) {
    if (this.mode === '--all') return this.all(root);
    if (this.mode === '--files') {
      return this.rest.map((file) => relative(root, resolve(this.cwd, file)));
    }
    if (this.mode === '--staged') {
      return this.git(root, [
        'diff',
        '--cached',
        '--name-only',
        '--diff-filter=ACMR',
      ]);
    }
    return [
      ...new Set([
        ...this.git(root, [
          'diff',
          '--name-only',
          '--diff-filter=ACMR',
          'HEAD',
        ]),
        ...this.git(root, ['ls-files', '--others', '--exclude-standard']),
      ]),
    ];
  }

  /**
   * Every tracked or new file.
   * @param {string} root Repository root.
   * @returns {string[]} The paths.
   */
  all(root) {
    return this.git(root, ['ls-files', '-co', '--exclude-standard']);
  }

  /**
   * Runs git and splits its output into lines.
   * @param {string} cwd Where git runs.
   * @param {string[]} args Git arguments.
   * @returns {string[]} The non-empty lines.
   */
  git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
}

process.exitCode = new LanguageCommand(
  process.argv.slice(2),
  process.cwd(),
).run();
