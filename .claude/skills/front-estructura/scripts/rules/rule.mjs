import { Violation } from '../violation.mjs';

// Structure rule. Subclasses implement appliesTo (by path only) and check.
// The engine calls check only if appliesTo returned true, and passes the file text
// only for .dart and pubspec.yaml (for everything else, text is '').
export class Rule {
  constructor(id, message) {
    this.id = id;
    this.message = message;
  }

  appliesTo(_file) {
    throw new Error(`${this.constructor.name}.appliesTo not implemented`);
  }

  // Returns Violation[]; empty if the file complies.
  check(_file, _text) {
    throw new Error(`${this.constructor.name}.check not implemented`);
  }

  violation(file, line = null) {
    return new Violation(file, this.id, this.message, line);
  }
}
