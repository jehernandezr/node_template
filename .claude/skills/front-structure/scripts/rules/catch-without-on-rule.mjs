import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class CatchWithoutOnRule extends Rule {
  static CATCH = /\bcatch\s*\(/;
  static ON_TYPE = /\bon\s+[\w.<>?,\s]+$/;

  constructor() {
    super(
      RuleId.CATCH_WITHOUT_ON,
      'catch without on: catch a specific type, or `on Object` for a catch-all the method /// explains',
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
      violations.push(this.violation(file, i + 1));
    }
    return violations;
  }
}
