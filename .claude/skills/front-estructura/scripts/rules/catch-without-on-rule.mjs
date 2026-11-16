import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class CatchWithoutOnRule extends Rule {
  static CATCH = /\bcatch\s*\(/;
  static ON_TYPE = /\bon\s+[\w.<>?,\s]+$/;
  // Un catch-all es válido solo si la línea anterior explica por qué.
  static CATCH_ALL_MARK = /^\/\/ catch-all:\s*\S/;

  constructor() {
    super(
      RuleId.CATCH_WITHOUT_ON,
      'catch sin on: captura un tipo concreto o marca el catch-all con // catch-all: motivo',
    );
  }

  appliesTo(file) {
    return (
      FrontPaths.isDartLib(file) &&
      !file.startsWith('front/packages/contracts/')
    );
  }

  check(file, text) {
    const violations = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('//')) continue;
      const match = CatchWithoutOnRule.CATCH.exec(lines[i]);
      if (!match) continue;
      const before = lines[i].slice(0, match.index);
      if (CatchWithoutOnRule.ON_TYPE.test(before)) continue;
      if (i > 0 && CatchWithoutOnRule.CATCH_ALL_MARK.test(lines[i - 1].trim()))
        continue;
      violations.push(this.violation(file, i + 1));
    }
    return violations;
  }
}
