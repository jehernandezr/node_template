import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class TextLiteralRule extends PatternRule {
  constructor() {
    super(
      RuleId.TEXT_LITERAL,
      'los textos de usuario salen de l10n, no de un Text con literal',
      // Un texto que solo interpola datos ($count, ${x.y}) no es texto de usuario.
      /\bText\(\s*(['"])(?!(?:\$\w+|\$\{[^}]*\})+\1)/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendScreen(file);
  }
}
