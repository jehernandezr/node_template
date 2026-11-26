import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects test doubles shared from `lib/testing`: they belong in the `test_utils` package. */
export class LibTestingRule extends Rule {
  constructor() {
    super(
      RuleId.LIB_TESTING,
      'shared test doubles go in the test_utils package, not in lib/testing',
    );
  }

  /** @override */
  appliesTo(file) {
    return /^front\/.+\/lib\/(testing\.dart|(.+\/)?testing\/)/.test(file);
  }

  /** @override */
  check(file, _text) {
    return [this.violation(file)];
  }
}
