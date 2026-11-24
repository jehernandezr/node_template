/** Conteo y suma de verificación de las filas del tenant en una tabla. */
export interface TableChecksum {
  readonly rows: number;
  readonly checksum: string;
}
