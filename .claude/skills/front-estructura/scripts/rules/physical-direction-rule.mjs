import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class PhysicalDirectionRule extends PatternRule {
  constructor() {
    super(
      RuleId.PHYSICAL_DIRECTION,
      'use directionality (AlignmentDirectional, EdgeInsetsDirectional, BorderRadiusDirectional) and radius tokens',
      /\bAlignment\.(centerLeft|centerRight)\b|\bEdgeInsets\.fromLTRB\b|\bBorderRadius\.circular\(\s*\d/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file);
  }
}
