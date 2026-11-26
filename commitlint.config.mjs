/** Lines that credit a tool or an assistant instead of the author, which commit messages never carry. */
class AttributionRule {
  static PATTERN = /^(co-authored-by:|generated (with|by)\b|🤖)/im;

  /**
   * Rejects a message with an attribution line.
   * @param {{ raw: string }} commit Parsed commit.
   * @returns {[boolean, string]} Whether it passes and why not.
   */
  static check(commit) {
    return [
      !AttributionRule.PATTERN.test(commit.raw ?? ''),
      'commit messages carry no Co-Authored-By or generated-by lines',
    ];
  }
}

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [{ rules: { 'no-ai-attribution': AttributionRule.check } }],
  rules: { 'no-ai-attribution': [2, 'always'] },
};
