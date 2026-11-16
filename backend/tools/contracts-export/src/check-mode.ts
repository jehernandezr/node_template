import type { ExportReport } from './artifact.type.js';
import { ExportMode } from './export-mode.js';
import type { FileSystem } from './file-system.js';

const UP_TO_DATE = 'Archivos generados al día.';
const DRIFT_HEADER =
  'Los archivos generados no coinciden con los contratos en TypeScript:';
const DRIFT_HINT =
  'Ejecuta: pnpm nx run contracts-export:export (y regenera el Dart con dart run contracts_gen en front/).';

/** Compara cada archivo generado con el de disco y recuerda los que difieren o faltan. */
export class CheckMode extends ExportMode {
  private readonly drift: string[] = [];

  constructor(private readonly fileSystem: FileSystem) {
    super();
  }

  async apply(path: string, content: string): Promise<void> {
    const missing = !(await this.fileSystem.exists(path));
    if (missing || (await this.fileSystem.read(path)) !== content) {
      this.drift.push(path);
    }
  }

  report(): ExportReport {
    if (this.drift.length === 0) {
      return { ok: true, lines: [UP_TO_DATE] };
    }
    const listed = this.drift.map((path) => `  ${path}`).join('\n');
    return {
      ok: false,
      lines: [`${DRIFT_HEADER}\n${listed}\n${DRIFT_HINT}`],
    };
  }
}
