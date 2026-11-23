/** Escapa texto para HTML. Utilidad pura. */
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
