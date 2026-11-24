import { GeneratorError, GeneratorErrorReason } from './generator-error.js';

/**
 * Un archivo con marcadores `// generated:<nombre>`: las líneas nuevas se insertan justo antes del marcador, con su
 * misma sangría, así el marcador queda listo para la siguiente.
 */
export class MarkedFile {
  private static readonly PREFIX = '// generated:';

  constructor(
    private readonly path: string,
    private text: string,
  ) {}

  /** @throws GeneratorError `MissingMarker` si el archivo no tiene el marcador. */
  insertBefore(marker: string, line: string): this {
    const lines = this.text.split('\n');
    const tag = `${MarkedFile.PREFIX}${marker}`;
    const index = lines.findIndex((candidate) => candidate.trim() === tag);
    const found = lines[index];
    if (found === undefined) {
      throw new GeneratorError(
        GeneratorErrorReason.MissingMarker,
        `${this.path} no tiene el marcador "${tag}"`,
      );
    }
    const indent = found.slice(0, found.length - found.trimStart().length);
    lines.splice(index, 0, `${indent}${line}`);
    this.text = lines.join('\n');
    return this;
  }

  content(): string {
    return this.text;
  }
}
