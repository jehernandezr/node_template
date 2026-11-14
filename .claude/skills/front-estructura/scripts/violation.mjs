// Un incumplimiento de una regla en un archivo, con la línea cuando la regla la conoce.
export class Violation {
  constructor(file, ruleId, message, line = null) {
    this.file = file;
    this.ruleId = ruleId;
    this.message = message;
    this.line = line;
  }

  toString() {
    const place = this.line === null ? this.file : `${this.file}:${this.line}`;
    return `${place}: ${this.message} [${this.ruleId}]`;
  }
}
