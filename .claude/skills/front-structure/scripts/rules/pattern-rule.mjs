import { Rule } from './rule.mjs';

/**
 * Rule that flags each line where a match of its regular expression starts.
 * It searches the whole file rather than line by line because dart format splits long
 * calls: `Text(` and its literal often end up on different lines.
 */
export class PatternRule extends Rule {
  static COMMENT_LINE = /^\s*\/\//;

  constructor(id, message, pattern) {
    super(id, message);
    const flags = pattern.flags.includes('g')
      ? pattern.flags
      : `${pattern.flags}g`;
    this.pattern = new RegExp(pattern.source, flags);
  }

  /** @override */
  check(file, text) {
    return this.#matchingLines(text).map((line) => this.violation(file, line));
  }

  /**
   * Line numbers (from 1, without repeats) where a match starts. Lines that are only a
   * comment are blanked before searching so they do not count.
   * @param {string} text Dart source.
   * @returns {number[]} The lines with a match.
   */
  #matchingLines(text) {
    const code = text
      .split('\n')
      .map((line) => (PatternRule.COMMENT_LINE.test(line) ? '' : line))
      .join('\n');
    const lines = new Set();
    let line = 1;
    let scanned = 0;
    for (const match of code.matchAll(this.pattern)) {
      for (; scanned < match.index; scanned++) {
        if (code[scanned] === '\n') line++;
      }
      lines.add(line);
    }
    return [...lines];
  }
}
