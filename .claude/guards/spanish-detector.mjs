/**
 * Tells whether a line of developer text is written in Spanish. It counts distinctive Spanish function words, which
 * English text and identifiers do not use, and the characters only Spanish has (`ñ`, `¿`, `¡`). In prose, code spans
 * and double-quoted text are left out first, so a document may quote a Spanish label of the interface; one accented
 * word alone, such as a name, is not enough.
 */
export class SpanishDetector {
  static MARKERS = new Set(
    'que para una los las del por con como está están también cuando pero porque sin sobre entre hasta desde donde este esta estos estas ese esa eso son ser hay muy más ya aquí puede pueden debe deben cada todo todos toda todas nuevo nueva otro otra sólo solo según mientras aunque luego después antes así cual cuál qué cómo dónde fue será tiene tienen hace hacer usa usar sus nos les lo al se su el en es un'.split(
      ' ',
    ),
  );
  static STRONG = new Set(
    'que para una los las del por con como está están también cuando pero porque sin sobre entre hasta desde donde estos estas muy más aquí puede pueden debe deben cada según mientras aunque después así qué cómo dónde será tiene tienen hacer usar'.split(
      ' ',
    ),
  );
  static ONLY_SPANISH = /[ñÑ¿¡]/;
  static ACCENTED = /[áéíóúÁÉÍÓÚ]/;
  static QUOTED = /`[^`]*`|"[^"]*"|“[^”]*”/g;
  static CODE_SPAN = /`[^`]*`/g;
  static SINGLE_QUOTED = /'(?:[^'\\]|\\.)*'/g;

  /**
   * Scores one line of text.
   * @param {string} line Text to judge.
   * @param {object} [kind] `prose` for documents, where quotes cite the interface;
   *   `dataStrings` where single-quoted literals are test data and do not count.
   * @returns {boolean} `true` when the line reads as Spanish.
   */
  isSpanish(line, kind = {}) {
    let text = line.replace(
      kind.prose ? SpanishDetector.QUOTED : SpanishDetector.CODE_SPAN,
      ' ',
    );
    if (kind.dataStrings)
      text = text.replace(SpanishDetector.SINGLE_QUOTED, ' ');
    const words = text.toLowerCase().match(/[a-záéíóúñü]+/g) ?? [];
    const markers = words.filter((word) => SpanishDetector.MARKERS.has(word));
    const strong = words.filter(
      (word) =>
        SpanishDetector.STRONG.has(word) &&
        !SpanishDetector.ACCENTED.test(word),
    );
    if (SpanishDetector.ONLY_SPANISH.test(text) && markers.length > 0) {
      return true;
    }
    if (SpanishDetector.ACCENTED.test(text) && strong.length > 0) return true;
    return strong.length >= 2 && markers.length >= 3;
  }
}
