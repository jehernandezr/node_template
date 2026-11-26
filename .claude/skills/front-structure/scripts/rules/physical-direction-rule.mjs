import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects physical directions (left, right) in layout: directional alignments, insets and radii keep right-to-left layouts correct. */
export class PhysicalDirectionRule extends PatternRule {
  constructor() {
    super(
      RuleId.PHYSICAL_DIRECTION,
      'use directionality (AlignmentDirectional, EdgeInsetsDirectional, BorderRadiusDirectional) and radius tokens',
      /\bAlignment\.(centerLeft|centerRight)\b|\bEdgeInsets\.fromLTRB\b|\bBorderRadius\.circular\(\s*\d/,
    );
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isMicrofrontendLib(file);
  }
}
