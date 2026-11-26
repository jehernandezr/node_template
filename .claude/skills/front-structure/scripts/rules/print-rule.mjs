import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects `print()` in library code: failures go through the error channel of the shell. */
export class PrintRule extends Rule {
  constructor() {
    super(
      RuleId.PRINT_CALL,
      'no print(): failures are reported through the shell error channel',
    );
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isDartLib(file);
  }

  /** @override */
  check(file, text) {
    return /^\s*print\(/m.test(text) ? [this.violation(file)] : [];
  }
}
