import { FrontPaths } from '../front-paths.mjs';
import { DartCommentScanner } from './dart-comment-scanner.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/**
 * The code explains itself: a Dart file has no comments other than `///` documentation of a declaration and the
 * analyzer `// ignore: <codes> -- <reason>` and `// ignore_for_file: <codes> -- <reason>` directives. A `///` inside
 * a function body or any other block of code documents nothing, so it counts as an inline comment. Generated files
 * are recognized by their path, by `FrontPaths.isGenerated`, never by a header the file could carry.
 */
export class InlineCommentRule extends Rule {
  static DOC = /^\/\/\/(?!\/)/;
  static DIRECTIVE = /^\/\/ ?ignore(_for_file)?: [\w=]+(, ?[\w=]+)* -- \S/;

  constructor() {
    super(
      RuleId.INLINE_COMMENT,
      'no inline comments: rename or extract; only /// docs of declarations and `// ignore: <codes> -- <reason>` directives are allowed',
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
    return this.scanner
      .scan(text)
      .filter((comment) => !this.#isAllowed(comment))
      .map((comment) => this.violation(file, comment.line));
  }

  #isAllowed(comment) {
    if (comment.block) return false;
    if (InlineCommentRule.DIRECTIVE.test(comment.text)) return true;
    return InlineCommentRule.DOC.test(comment.text) && !comment.inCode;
  }
}
