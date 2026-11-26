import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LanguageAllowlist } from './language-allowlist.mjs';

/**
 * Which repository files are developer text that must be English, which ones the allowlist leaves alone, which part
 * of a line holds text, and where single-quoted literals are test data rather than prose.
 */
export class LanguagePolicy {
  static TEXT_FILE = /\.(ts|mjs|cjs|js|dart|md|ya?ml|json|tf|sh|py)$/;
  static C_SYNTAX = /\.(ts|mjs|cjs|js|dart|json)$/;
  static HASH_SYNTAX = /\.(ya?ml|tf|sh|py)$/;
  static ALLOWLIST = join(
    dirname(fileURLToPath(import.meta.url)),
    'language-allowlist.json',
  );
  static TEST_DATA = [
    /\/__tests__\//,
    /\.(int-|e2e-)?spec\.ts$/,
    /\.e2e-spec\.ts$/,
    /^front\/.+\/test\//,
    /^front\/packages\/test_utils\//,
    /^front\/.+\/lib\/src\/data\/fake_[\w]+\.dart$/,
  ];

  /**
   * @param {LanguageAllowlist} [allowlist] Paths and lines left alone; the repository allowlist by default.
   */
  constructor(allowlist = LanguageAllowlist.read(LanguagePolicy.ALLOWLIST)) {
    this.allowlist = allowlist;
  }

  /**
   * Tells whether a file is developer text the check reads.
   * @param {string} file Path from the repository root.
   * @returns {boolean} `true` for a text file outside the allowed paths.
   */
  checks(file) {
    return (
      LanguagePolicy.TEXT_FILE.test(file) && !this.allowlist.allowsFile(file)
    );
  }

  /**
   * Tells whether one line of a file is allowed although it reads as Spanish.
   * @param {string} file Path from the repository root.
   * @param {string} line The line.
   * @returns {boolean} `true` when the allowlist names it.
   */
  allowsLine(file, line) {
    return this.allowlist.allowsLine(file, line);
  }

  /**
   * How comments start in a file, so only comments and strings of code are read.
   * @param {string} file Path from the repository root.
   * @returns {'c' | 'hash' | undefined} The comment syntax, or `undefined` for prose read whole.
   */
  syntaxOf(file) {
    if (LanguagePolicy.C_SYNTAX.test(file)) return 'c';
    if (LanguagePolicy.HASH_SYNTAX.test(file)) return 'hash';
    return undefined;
  }

  /**
   * Tells whether a file is prose, where quotes and code spans cite the interface rather than speak.
   * @param {string} file Path from the repository root.
   * @returns {boolean} `true` for Markdown.
   */
  isProse(file) {
    return file.endsWith('.md');
  }

  /**
   * Tells whether the single-quoted literals of a file are test data in the locale of the product.
   * @param {string} file Path from the repository root.
   * @returns {boolean} `true` for tests, test utilities and fake repositories.
   */
  hasDataStrings(file) {
    return LanguagePolicy.TEST_DATA.some((pattern) => pattern.test(file));
  }
}
