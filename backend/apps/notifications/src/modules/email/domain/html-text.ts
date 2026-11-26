/** Escapes text for HTML. Pure utility. */
export class HtmlText {
  private static readonly ENTITIES: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  /**
   * Escapes the characters HTML gives meaning to, so a parameter never becomes markup.
   * @param value Raw text.
   * @returns The escaped text.
   */
  static escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HtmlText.ENTITIES[char] ?? char);
  }
}
