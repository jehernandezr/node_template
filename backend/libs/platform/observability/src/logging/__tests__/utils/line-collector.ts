/** Acumula las líneas que escribe un `StdoutLogSink`, para pruebas. */
export class LineCollector {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }

  /** Cada línea ya parseada como objeto JSON. */
  parsed(): Record<string, unknown>[] {
    return this.lines.map(
      (line) => JSON.parse(line) as Record<string, unknown>,
    );
  }
}
