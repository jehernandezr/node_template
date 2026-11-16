import { Rule } from './rule.mjs';

// Regla que marca cada línea donde empieza una coincidencia de su expresión regular.
// Busca sobre el archivo completo y no línea a línea porque dart format parte las llamadas
// largas: `Text(` y su literal suelen quedar en líneas distintas.
export class PatternRule extends Rule {
  static COMMENT_LINE = /^\s*\/\//;

  constructor(id, message, pattern) {
    super(id, message);
    const flags = pattern.flags.includes('g')
      ? pattern.flags
      : `${pattern.flags}g`;
    this.pattern = new RegExp(pattern.source, flags);
  }

  check(file, text) {
    return this.matchingLines(text).map((line) => this.violation(file, line));
  }

  // Números de línea (desde 1, sin repetir) donde empieza una coincidencia. Las líneas que
  // son solo comentario se vacían antes de buscar para que no cuenten.
  matchingLines(text) {
    const code = text
      .split('\n')
      .map((line) => (PatternRule.COMMENT_LINE.test(line) ? '' : line))
      .join('\n');
    const lines = new Set();
    let line = 1;
    let scanned = 0;
    for (const match of code.matchAll(this.pattern)) {
      for (; scanned < match.index; scanned++) {
        if (code[scanned] === '\n') line++;
      }
      lines.add(line);
    }
    return [...lines];
  }
}
