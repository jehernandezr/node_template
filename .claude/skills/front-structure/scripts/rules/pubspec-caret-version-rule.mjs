import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects `^` ranges on the external dependencies of a member pubspec: every dependency uses an exact version. */
export class PubspecCaretVersionRule extends Rule {
  /** The SDK constraint does allow ^; dependencies do not. */
  static PATTERN = /^\s+(?!sdk:)[A-Za-z_]\w*:\s*["']?\^/;

  constructor() {
    super(
      RuleId.PUBSPEC_CARET_VERSION,
      'external dependencies use an exact version, without ^',
    );
  }

  /**
   * Tells whether a YAML line is only a comment, which starts with `#`.
   * @param {string} line Line of the pubspec.
   * @returns {boolean} Whether the line is a comment.
   */
  static isYamlComment(line) {
    return line.trim().startsWith('#');
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isMemberPubspec(file);
  }

  /** @override */
  check(file, text) {
    const violations = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (PubspecCaretVersionRule.isYamlComment(lines[i])) continue;
      if (PubspecCaretVersionRule.PATTERN.test(lines[i])) {
        violations.push(this.violation(file, i + 1));
      }
    }
    return violations;
  }
}
