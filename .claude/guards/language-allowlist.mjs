import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';

/**
 * @typedef {{ paths: { pattern: string, reason: string }[], lines: { file: string, text: string, reason: string }[] }} AllowlistEntries
 *   The entries of `language-allowlist.json`.
 */

/**
 * What the language check leaves alone, each entry with its reason: whole paths that hold product text, and single
 * lines whose Spanish-looking word is a name or a quote. A false positive is fixed here, never by widening the word
 * list of `SpanishDetector`.
 */
export class LanguageAllowlist {
  /**
   * @param {AllowlistEntries} entries Path globs and single lines, each with why it is allowed.
   */
  constructor(entries) {
    this.paths = entries.paths ?? [];
    this.lines = entries.lines ?? [];
  }

  /**
   * Reads the allowlist file.
   * @param {string} path Absolute path of the JSON file.
   * @returns {LanguageAllowlist} The entries.
   */
  static read(path) {
    return new LanguageAllowlist(JSON.parse(readFileSync(path, 'utf8')));
  }

  /**
   * Tells whether a whole file is allowed.
   * @param {string} file Path from the repository root.
   * @returns {boolean} `true` when a path entry matches it.
   */
  allowsFile(file) {
    return this.paths.some((entry) => matchesGlob(file, entry.pattern));
  }

  /**
   * Tells whether one line of a file is allowed.
   * @param {string} file Path from the repository root.
   * @param {string} line The line.
   * @returns {boolean} `true` when a line entry of that file is contained in it.
   */
  allowsLine(file, line) {
    return this.lines.some(
      (entry) => entry.file === file && line.includes(entry.text),
    );
  }

  /**
   * Entries that do not say why they are allowed, or whose line entry spans more than one line.
   * @returns {string[]} The pattern or file of each such entry.
   */
  unexplained() {
    return [
      ...this.paths
        .filter((entry) => !entry.reason?.trim())
        .map((entry) => entry.pattern),
      ...this.lines
        .filter((entry) => !entry.reason?.trim() || entry.text.includes('\n'))
        .map((entry) => entry.file),
    ];
  }
}
