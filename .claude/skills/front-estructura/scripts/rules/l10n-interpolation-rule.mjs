import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class L10nInterpolationRule extends PatternRule {
  constructor() {
    super(
      RuleId.L10N_INTERPOLATION,
      'las frases con datos son claves ARB con parámetros, no interpolaciones de l10n con : o ·',
      /\$\{l10n\.[^}]*\}\s?[:·]/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file) || FrontPaths.isUiLib(file);
  }
}
