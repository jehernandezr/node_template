import type { ExportReport } from './artifact.type.js';
import { ExportMode } from './export-mode.js';
import type { FileSystem } from './file-system.js';

/** Escribe cada archivo generado, sobrescribiendo el que haya. */
export class WriteMode extends ExportMode {
  private readonly lines: string[] = [];

  constructor(private readonly fileSystem: FileSystem) {
    super();
  }

  async apply(path: string, content: string): Promise<void> {
    await this.fileSystem.write(path, content);
    this.lines.push(`Escrito ${path}`);
  }

  report(): ExportReport {
    return { ok: true, lines: [...this.lines] };
  }
}
