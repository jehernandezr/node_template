/** Accumulates the lines a `StdoutLogSink` writes, for tests. */
export class LineCollector {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }

  /** Each line already parsed as a JSON object. */
  parsed(): Record<string, unknown>[] {
    return this.lines.map(
      (line) => JSON.parse(line) as Record<string, unknown>,
    );
  }
}
