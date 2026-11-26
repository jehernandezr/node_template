import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects a `Text` with a literal in a microfrontend: texts the user reads come from l10n. */
export class TextLiteralRule extends PatternRule {
  /** A `Text` whose literal only interpolates data (`$count`, `${x.y}`) shows no user text, so it is allowed. */
  static LITERAL = /\bText\(\s*(['"])(?!(?:\$\w+|\$\{[^}]*\})+\1)/;

  constructor() {
    super(
      RuleId.TEXT_LITERAL,
      'user texts come from l10n, not from a Text with a literal',
      TextLiteralRule.LITERAL,
    );
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isMicrofrontendScreen(file);
  }
}
