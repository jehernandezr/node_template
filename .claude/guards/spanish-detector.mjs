/** @typedef {{ prose?: boolean, dataStrings?: boolean, syntax?: 'c' | 'hash' }} LineKind How a line is read. */

/**
 * Tells whether a line of developer text is written in Spanish. It matches whole words against a closed list of
 * high-signal Spanish function words that English text and identifiers do not use, and looks for the characters
 * English does not use (accented vowels, `ñ`, `ü`, `¿` and `¡`). In code it reads only comments and string literals;
 * in prose it leaves out code spans and double-quoted text, so a document may quote a Spanish label of the
 * interface. A false positive is fixed in `language-allowlist.json`, never by changing the word list.
 */
export class SpanishDetector {
  static WORDS = Object.freeze([
    'que',
    'para',
    'una',
    'por',
    'como',
    'pero',
    'porque',
    'cuando',
    'sobre',
    'entre',
    'hasta',
    'desde',
    'donde',
    'este',
    'esta',
    'esto',
    'estos',
    'estas',
    'muy',
    'puede',
    'pueden',
    'debe',
    'deben',
    'cada',
    'mientras',
    'aunque',
    'tiene',
    'tienen',
    'hacer',
    'usar',
    'nuevo',
    'nueva',
    'otro',
    'otra',
    'todas',
    'fue',
    'del',
    'los',
    'las',
    'algunos',
    'ellos',
    'cual',
    'cuyo',
    'luego',
    'siempre',
    'nunca',
    'ahora',
    'aqui',
    'tambien',
    'despues',
  ]);
  static WORD_SET = new Set(SpanishDetector.WORDS);
  static SPANISH_CHARACTER = /[áéíóúñü¿¡]/i;
  static WORD = /[\p{L}¿¡]+/gu;
  static QUOTED = /`[^`]*`|"[^"]*"|“[^”]*”/g;
  static CODE_SPAN = /`[^`]*`/g;
  static SINGLE_QUOTED = /'(?:[^'\\]|\\.)*'/g;
  static COMMENT_LINE = {
    c: /^\s*(\/\/|\/\*|\*)/,
    hash: /^\s*#/,
  };

  /**
   * Scores one line of text.
   * @param {string} line Text to judge.
   * @param {LineKind} [kind] `prose` for documents, where
   *   quotes cite the interface; `dataStrings` where single-quoted literals are test data and do not count; `syntax`
   *   for code, whose comments start with `//` or `#`, so only comments and strings are read.
   * @returns {boolean} `true` when the line reads as Spanish.
   */
  isSpanish(line, kind = {}) {
    let text = kind.dataStrings
      ? line.replace(SpanishDetector.SINGLE_QUOTED, ' ')
      : line;
    if (kind.syntax !== undefined) {
      text = this.commentsAndStrings(text, kind.syntax);
    }
    text = text.replace(
      kind.prose ? SpanishDetector.QUOTED : SpanishDetector.CODE_SPAN,
      ' ',
    );
    return (text.match(SpanishDetector.WORD) ?? []).some(
      (word) =>
        SpanishDetector.SPANISH_CHARACTER.test(word) ||
        SpanishDetector.WORD_SET.has(word.toLowerCase()),
    );
  }

  /**
   * The parts of a line of code that hold text: its comment and the content of its string literals.
   * @param {string} line Line of code.
   * @param {'c' | 'hash'} syntax How comments start.
   * @returns {string} Those parts, joined by spaces.
   */
  commentsAndStrings(line, syntax) {
    if (SpanishDetector.COMMENT_LINE[syntax].test(line)) return line;
    const parts = [];
    let quote = '';
    let current = '';
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (quote !== '') {
        if (char === '\\') {
          current += line[index + 1] ?? '';
          index += 1;
        } else if (char === quote) {
          parts.push(current);
          quote = '';
          current = '';
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'" || char === '`') {
        quote = char;
      } else if (
        (syntax === 'c' && line.startsWith('//', index)) ||
        (syntax === 'c' && line.startsWith('/*', index)) ||
        (syntax === 'hash' && char === '#')
      ) {
        parts.push(line.slice(index));
        break;
      }
    }
    if (quote !== '') parts.push(current);
    return parts.join(' ');
  }
}
