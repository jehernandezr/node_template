import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class DatetimeNowRule extends PatternRule {
  // El único lugar que lee el reloj del sistema.
  static CLOCK_FILE = 'front/packages/utils/lib/src/clock.dart';

  constructor() {
    super(
      RuleId.DATETIME_NOW,
      'el tiempo se inyecta con un Clock; nada de DateTime.now() en la lógica',
      /\bDateTime\.now\(\)/,
    );
  }

  appliesTo(file) {
    return FrontPaths.isDartLib(file) && file !== DatetimeNowRule.CLOCK_FILE;
  }
}
