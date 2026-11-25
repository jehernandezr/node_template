import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class PubspecCaretVersionRule extends Rule {
  // The SDK constraint does allow ^; dependencies do not.
  static PATTERN = /^\s+(?!sdk:)[A-Za-z_]\w*:\s*["']?\^/;

  constructor() {
    super(
      RuleId.PUBSPEC_CARET_VERSION,
      'external dependencies use an exact version, without ^',
    );
  }

  appliesTo(file) {
    return FrontPaths.isMemberPubspec(file);
  }

  check(file, text) {
    const violations = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // In YAML a comment starts with #.
      if (lines[i].trim().startsWith('#')) continue;
      if (PubspecCaretVersionRule.PATTERN.test(lines[i])) {
        violations.push(this.violation(file, i + 1));
      }
    }
    return violations;
  }
}
