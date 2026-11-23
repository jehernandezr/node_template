/**
 * CSV según RFC 4180: separado por comas, líneas con CRLF y comillas solo donde hacen falta. Una celda que
 * empieza con `=`, `+`, `-` o `@` lleva un apóstrofo delante para que una hoja de cálculo no la evalúe como
 * fórmula. Utilidad pura.
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
