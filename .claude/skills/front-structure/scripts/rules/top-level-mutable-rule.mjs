import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects mutable top-level variables in library code: state lives in classes, and a top-level declaration is `final` or `const`. */
export class TopLevelMutableRule extends Rule {
  /** A declaration at column 0 that is neither final nor const: class members are indented. */
  static PATTERN =
    /^(?!final\b|const\b|typedef\b|import\b|export\b|part\b|library\b|return\b)(var\s+\w+|late\s+\S+|[A-Za-z_]\w*(<[^>\n]*>)?\??\s+_?\w+\s*=(?![=>]))/m;

  constructor() {
    super(RuleId.TOP_LEVEL_MUTABLE, 'no mutable state in top-level variables');
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isDartLib(file);
  }

  /** @override */
  check(file, text) {
    return TopLevelMutableRule.PATTERN.test(text) ? [this.violation(file)] : [];
  }
}
