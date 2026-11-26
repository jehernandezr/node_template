import { FrontPaths } from '../front-paths.mjs';
import { DartCommentScanner } from './dart-comment-scanner.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/**
 * The code explains itself: a Dart file has no comments other than `///` documentation and the analyzer
 * `// ignore:` and `// ignore_for_file:` directives. Generated files are skipped.
 */
export class InlineCommentRule extends Rule {
  static DOC = /^\/\/\/(?!\/)/;
  static DIRECTIVE = /^\/\/ ?ignore(_for_file)?: \S/;
  static GENERATED_HEADER = /^\/\/ GENERATED/;

  constructor() {
    super(
      RuleId.INLINE_COMMENT,
      'no inline comments: rename or extract; only /// docs and // ignore: directives are allowed',
    );
    this.scanner = new DartCommentScanner();
  }

  /**
   * Applies to every Dart file of the front.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether the rule checks the file.
   */
  appliesTo(file) {
    return FrontPaths.isDart(file);
  }

  /**
   * Flags each comment that is neither documentation nor an analyzer directive.
   * @param {string} file Path from the repository root.
   * @param {string} text Dart source.
   * @returns {import('../violation.mjs').Violation[]} One violation per offending comment.
   */
  check(file, text) {
    if (InlineCommentRule.GENERATED_HEADER.test(text)) return [];
    return this.scanner
      .scan(text)
      .filter((comment) => !this.isAllowed(comment))
      .map((comment) => this.violation(file, comment.line));
  }

  isAllowed(comment) {
    return (
      !comment.block &&
      (InlineCommentRule.DOC.test(comment.text) ||
        InlineCommentRule.DIRECTIVE.test(comment.text))
    );
  }
}
