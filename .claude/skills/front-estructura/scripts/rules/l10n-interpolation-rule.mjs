import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class L10nInterpolationRule extends PatternRule {
  constructor() {
    super(
      RuleId.L10N_INTERPOLATION,
      'sentences with data are ARB keys with parameters, not l10n interpolations with : or ·',
      /\$\{l10n\.[^}]*\}\s?[:·]/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file) || FrontPaths.isUiLib(file);
  }
}
