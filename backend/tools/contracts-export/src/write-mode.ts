import type { ExportReport } from './artifact.type.js';
import { ExportMode } from './export-mode.js';
import type { FileSystem } from './file-system.js';

/** Writes each generated file, overwriting any existing one. */
export class WriteMode extends ExportMode {
  private readonly lines: string[] = [];

  constructor(private readonly fileSystem: FileSystem) {
    super();
  }

  override async apply(path: string, content: string): Promise<void> {
    await this.fileSystem.write(path, content);
    this.lines.push(`Wrote ${path}`);
  }

  override report(): ExportReport {
    return { ok: true, lines: [...this.lines] };
  }
}
