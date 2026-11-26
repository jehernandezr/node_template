/**
 * A rule violation in a file, with the line when the rule knows it.
 */
export class Violation {
  constructor(file, ruleId, message, line = null) {
    this.file = file;
    this.ruleId = ruleId;
    this.message = message;
    this.line = line;
  }

  /**
   * Formats the violation as one line of the report: the place, the message and the rule id.
   * @returns {string} The report line.
   */
  toString() {
    const place = this.line === null ? this.file : `${this.file}:${this.line}`;
    return `${place}: ${this.message} [${this.ruleId}]`;
  }
}
