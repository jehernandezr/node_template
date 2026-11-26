import { Violation } from '../violation.mjs';

/**
 * Structure rule. Subclasses implement appliesTo (by path only) and check.
 * The engine calls check only if appliesTo returned true, and passes the file text
 * only for .dart and pubspec.yaml (for everything else, text is '').
 */
export class Rule {
  constructor(id, message) {
    this.id = id;
    this.message = message;
  }

  /**
   * Tells whether the rule checks a file, by its path only.
   * @param {string} _file Path from the repository root.
   * @returns {boolean} Whether the engine should call `check`.
   */
  appliesTo(_file) {
    throw new Error(`${this.constructor.name}.appliesTo not implemented`);
  }

  /**
   * Checks a file the rule applies to.
   * @param {string} _file Path from the repository root.
   * @param {string} _text File text for `.dart` and `pubspec.yaml`; `''` for any other file.
   * @returns {import('../violation.mjs').Violation[]} The violations; empty if the file complies.
   */
  check(_file, _text) {
    throw new Error(`${this.constructor.name}.check not implemented`);
  }

  /**
   * Builds a violation of this rule.
   * @param {string} file Path from the repository root.
   * @param {number | null} line Line of the violation, or `null` when it is the whole file.
   * @returns {import('../violation.mjs').Violation} The violation with the rule id and message.
   */
  violation(file, line = null) {
    return new Violation(file, this.id, this.message, line);
  }
}
