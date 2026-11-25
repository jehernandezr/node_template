/** Escapes text for HTML. Pure utility. */
export class HtmlText {
  private static readonly ENTITIES: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  static escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HtmlText.ENTITIES[char] ?? char);
  }
}
