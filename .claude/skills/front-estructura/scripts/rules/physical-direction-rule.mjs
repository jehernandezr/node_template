import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class PhysicalDirectionRule extends PatternRule {
  constructor() {
    super(
      RuleId.PHYSICAL_DIRECTION,
      'usa direccionalidad (AlignmentDirectional, EdgeInsetsDirectional, BorderRadiusDirectional) y tokens de radio',
      /\bAlignment\.(centerLeft|centerRight)\b|\bEdgeInsets\.fromLTRB\b|\bBorderRadius\.circular\(\s*\d/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file);
  }
}
