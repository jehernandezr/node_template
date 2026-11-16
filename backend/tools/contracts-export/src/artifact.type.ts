/** Archivo generado: dónde va y el valor JSON que contiene. */
export interface Artifact {
  readonly path: string;
  readonly value: unknown;
}

/** Resultado de procesar los artefactos: éxito y las líneas para el usuario. */
export interface ExportReport {
  readonly ok: boolean;
  readonly lines: readonly string[];
}
