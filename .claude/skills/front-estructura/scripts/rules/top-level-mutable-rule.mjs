import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class TopLevelMutableRule extends Rule {
  // Una declaración en la columna 0 que no es final ni const: los miembros de clase van indentados.
  static PATTERN =
    /^(?!final\b|const\b|typedef\b|import\b|export\b|part\b|library\b|return\b)(var\s+\w+|late\s+\S+|[A-Za-z_]\w*(<[^>\n]*>)?\??\s+_?\w+\s*=(?![=>]))/m;

  constructor() {
    super(
      RuleId.TOP_LEVEL_MUTABLE,
      'sin estado mutable en variables de nivel superior',
    );
  }

  appliesTo(file) {
    return FrontPaths.isDartLib(file);
  }

  check(file, text) {
    return TopLevelMutableRule.PATTERN.test(text) ? [this.violation(file)] : [];
  }
}
