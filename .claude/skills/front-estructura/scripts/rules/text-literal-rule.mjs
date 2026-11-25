import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class TextLiteralRule extends PatternRule {
  constructor() {
    super(
      RuleId.TEXT_LITERAL,
      'user texts come from l10n, not from a Text with a literal',
      // A text that only interpolates data ($count, ${x.y}) is not user text.
      /\bText\(\s*(['"])(?!(?:\$\w+|\$\{[^}]*\})+\1)/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendScreen(file);
  }
}
