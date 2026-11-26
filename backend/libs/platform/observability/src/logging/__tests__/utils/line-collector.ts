/** Accumulates the lines a `StdoutLogSink` writes, for tests. */
export class LineCollector {
  readonly lines: string[] = [];
  readonly chunks: string[] = [];

  write(chunk: string): boolean {
    this.lines.push(...chunk.split('\n').filter((line) => line.length > 0));
    this.chunks.push(chunk);
    return true;
  }

  /** Each line already parsed as a JSON object. */
  parsed(): Record<string, unknown>[] {
    return this.lines.map(
      (line) => JSON.parse(line) as Record<string, unknown>,
    );
  }
}
