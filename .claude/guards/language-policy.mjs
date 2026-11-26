/**
 * Which repository files are developer text that must be English, which ones hold product text in its locale, and
 * where single-quoted literals are test data rather than prose.
 */
export class LanguagePolicy {
  static TEXT_FILE = /\.(ts|mjs|cjs|js|dart|md|ya?ml|json|tf|sh|py)$/;
  static PRODUCT_TEXT = [
    /\.arb$/,
    /^front\/packages\/i18n\//,
    /\/l10n\/generated\//,
    /^backend\/apps\/notifications\/src\/modules\/email\/domain\/templates\//,
    /^backend\/apps\/notifications\/src\/modules\/dispatch\/domain\/notification-texts\.ts$/,
    /^docs\/audits\//,
    /^docs\/plan\/archive\//,
    /^\.claude\/guards\/spanish-detector\.mjs$/,
    /(^|\/)pnpm-lock\.yaml$/,
    /(^|\/)pubspec\.lock$/,
  ];
  static TEST_DATA = [
    /\/__tests__\//,
    /\.(int-|e2e-)?spec\.ts$/,
    /\.e2e-spec\.ts$/,
    /^front\/.+\/test\//,
    /^front\/packages\/test_utils\//,
    /^front\/.+\/lib\/src\/data\/fake_[\w]+\.dart$/,
  ];

  /**
   * Tells whether a file is developer text the check reads.
   * @param {string} file Path from the repository root.
   * @returns {boolean} `true` for a text file outside the product-text paths.
   */
  checks(file) {
    return (
      LanguagePolicy.TEXT_FILE.test(file) &&
      !LanguagePolicy.PRODUCT_TEXT.some((pattern) => pattern.test(file))
    );
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
