import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class PrintRule extends Rule {
  constructor() {
    super(
      RuleId.PRINT_CALL,
      'sin print(): los fallos se reportan por el canal de errores del shell',
    );
  }

  appliesTo(file) {
    return FrontPaths.isDartLib(file);
  }

  check(file, text) {
    return /^\s*print\(/m.test(text) ? [this.violation(file)] : [];
  }
}
