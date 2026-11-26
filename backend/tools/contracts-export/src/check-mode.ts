import type { ExportReport } from './artifact.type.js';
import { ExportMode } from './export-mode.js';
import type { FileSystem } from './file-system.js';

const UP_TO_DATE = 'Generated files up to date.';
const DRIFT_HEADER =
  'The generated files do not match the TypeScript contracts:';
const DRIFT_HINT =
  'Run: pnpm nx run contracts-export:export (and regenerate the Dart with dart run contracts_gen in front/).';

/** Compares each generated file with the one on disk and remembers those that differ or are missing. */
export class CheckMode extends ExportMode {
  private readonly drift: string[] = [];

  constructor(private readonly fileSystem: FileSystem) {
    super();
  }

  override async apply(path: string, content: string): Promise<void> {
    const missing = !(await this.fileSystem.exists(path));
    if (missing || (await this.fileSystem.read(path)) !== content) {
      this.drift.push(path);
    }
  }

  override report(): ExportReport {
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
