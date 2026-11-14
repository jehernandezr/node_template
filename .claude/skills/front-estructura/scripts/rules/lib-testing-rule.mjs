import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class LibTestingRule extends Rule {
  constructor() {
    super(
      RuleId.LIB_TESTING,
      'los dobles compartidos van en el paquete test_utils, no en lib/testing',
    );
  }

  appliesTo(file) {
    return /^front\/.+\/lib\/(testing\.dart|(.+\/)?testing\/)/.test(file);
  }

  check(file, _text) {
    return [this.violation(file)];
  }
}
