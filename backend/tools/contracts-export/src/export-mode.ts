import type { ExportReport } from './artifact.type.js';

/**
 * What is done with each generated file: write it or compare it with the one already
 * on disk. An instance serves a single run.
 */
export abstract class ExportMode {
  abstract apply(path: string, content: string): Promise<void>;
  abstract report(): ExportReport;
}
