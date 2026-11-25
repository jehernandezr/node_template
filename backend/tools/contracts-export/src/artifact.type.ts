/** Generated file: where it goes and the JSON value it contains. */
export interface Artifact {
  readonly path: string;
  readonly value: unknown;
}

/** Result of processing the artifacts: success and the lines for the user. */
export interface ExportReport {
  readonly ok: boolean;
  readonly lines: readonly string[];
}
