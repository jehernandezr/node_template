import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class LibTestingRule extends Rule {
  constructor() {
    super(
      RuleId.LIB_TESTING,
      'shared test doubles go in the test_utils package, not in lib/testing',
    );
  }

  appliesTo(file) {
    return /^front\/.+\/lib\/(testing\.dart|(.+\/)?testing\/)/.test(file);
  }

  check(file, _text) {
    return [this.violation(file)];
  }
}
