import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class DatetimeNowRule extends PatternRule {
  // The only place that reads the system clock.
  static CLOCK_FILE = 'front/packages/utils/lib/src/clock.dart';

  constructor() {
    super(
      RuleId.DATETIME_NOW,
      'time is injected with a Clock; no DateTime.now() in the logic',
      /\bDateTime\.now\(\)/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isDartLib(file) && file !== DatetimeNowRule.CLOCK_FILE;
  }
}
