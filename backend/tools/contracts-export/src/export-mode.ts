import type { ExportReport } from './artifact.type.js';

/**
 * What is done with each generated file: write it or compare it with the one already
 * on disk. An instance serves a single run.
 */
export abstract class ExportMode {
  /**
   * Writes an artifact, or compares it with the one on disk.
   * @param path Path of the artifact.
   * @param content Rendered content.
   */
  abstract apply(path: string, content: string): Promise<void>;
  /**
   * Summarizes what the mode did.
   * @returns The report.
   */
  abstract report(): ExportReport;
}
