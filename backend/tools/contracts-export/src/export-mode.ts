import type { ExportReport } from './artifact.type.js';

/**
 * Qué se hace con cada archivo generado: escribirlo o compararlo con el que ya
 * está en disco. Una instancia sirve a una sola ejecución.
 */
export abstract class ExportMode {
  abstract apply(path: string, content: string): Promise<void>;
  abstract report(): ExportReport;
}
