import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects colors written in a microfrontend: they come from the tokens and the theme. */
export class HardcodedColorRule extends PatternRule {
  constructor() {
    super(
      RuleId.HARDCODED_COLOR,
      'colors come from the tokens and the theme, not from Color(0x...) or Colors.',
      /\bColor\(\s*0x|\bColors\./,
    );
  }

  /**
   * Limits the rule to microfrontends: the tokens and the ui theme do define colors, and only microfrontends consume
   * them.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is microfrontend library code.
   */
  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file);
  }
}
