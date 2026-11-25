import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class PrintRule extends Rule {
  constructor() {
    super(
      RuleId.PRINT_CALL,
      'no print(): failures are reported through the shell error channel',
    );
  }

  appliesTo(file) {
    return FrontPaths.isDartLib(file);
  }

  check(file, text) {
    return /^\s*print\(/m.test(text) ? [this.violation(file)] : [];
  }
}
