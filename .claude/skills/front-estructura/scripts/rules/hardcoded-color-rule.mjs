import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class HardcodedColorRule extends PatternRule {
  constructor() {
    super(
      RuleId.HARDCODED_COLOR,
      'los colores salen de los tokens y del tema, no de Color(0x...) ni Colors.',
      /\bColor\(\s*0x|\bColors\./,
    );
  }

  // Los tokens y el tema de ui sí definen colores; solo los microfrontends los consumen.
  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file);
  }
}
