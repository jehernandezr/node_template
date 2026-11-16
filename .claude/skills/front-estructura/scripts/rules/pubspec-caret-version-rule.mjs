import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class PubspecCaretVersionRule extends Rule {
  // La restricción del SDK sí admite ^; las dependencias no.
  static PATTERN = /^\s+(?!sdk:)[A-Za-z_]\w*:\s*["']?\^/;

  constructor() {
    super(
      RuleId.PUBSPEC_CARET_VERSION,
      'las dependencias externas llevan versión exacta, sin ^',
    );
  }

  appliesTo(file) {
    return FrontPaths.isMemberPubspec(file);
  }

  check(file, text) {
    const violations = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // En YAML el comentario empieza con #.
      if (lines[i].trim().startsWith('#')) continue;
      if (PubspecCaretVersionRule.PATTERN.test(lines[i])) {
        violations.push(this.violation(file, i + 1));
      }
    }
    return violations;
  }
}
