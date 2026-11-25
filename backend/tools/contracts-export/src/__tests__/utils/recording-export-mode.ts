import type { ExportReport } from '../../artifact.type.js';
import { ExportMode } from '../../export-mode.js';

/** Mode that only stores each call, in order, to check what it received. */
export class RecordingExportMode extends ExportMode {
  readonly applied: { readonly path: string; readonly content: string }[] = [];

  apply(path: string, content: string): Promise<void> {
    this.applied.push({ path, content });
    return Promise.resolve();
  }

  report(): ExportReport {
    return { ok: true, lines: this.applied.map((call) => call.path) };
  }
}
