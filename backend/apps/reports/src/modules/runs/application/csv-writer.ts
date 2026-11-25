/**
 * CSV per RFC 4180: comma separated, CRLF lines and quotes only where needed. A cell that
 * starts with `=`, `+`, `-` or `@` gets a leading apostrophe so a spreadsheet does not evaluate it as a
 * formula. Pure utility.
 */
export class CsvWriter {
  private static readonly NEEDS_QUOTES = /[",\r\n]/;
  private static readonly FORMULA = /^[=+\-@]/;

  static write(lines: readonly (readonly string[])[]): string {
    return lines
      .map((cells) => cells.map((cell) => CsvWriter.cell(cell)).join(','))
      .join('\r\n');
  }

  private static cell(value: string): string {
    const safe = CsvWriter.FORMULA.test(value) ? `'${value}` : value;
    return CsvWriter.NEEDS_QUOTES.test(safe)
      ? `"${safe.replaceAll('"', '""')}"`
      : safe;
  }
}
