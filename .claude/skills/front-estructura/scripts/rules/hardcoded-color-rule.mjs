import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class HardcodedColorRule extends PatternRule {
  constructor() {
    super(
      RuleId.HARDCODED_COLOR,
      'colors come from the tokens and the theme, not from Color(0x...) or Colors.',
      /\bColor\(\s*0x|\bColors\./,
    );
  }

  // The tokens and the ui theme do define colors; only microfrontends consume them.
  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file);
  }
}
