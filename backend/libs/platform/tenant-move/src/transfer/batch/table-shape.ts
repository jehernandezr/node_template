/** Lo que la copia necesita saber de una tabla, leído del catálogo de PostgreSQL. */
export interface TableShape {
  readonly table: string;
  /** Columnas que se escriben; las generadas no. */
  readonly columns: readonly string[];
  /** Columnas de la llave primaria, en orden. */
  readonly keyColumns: readonly string[];
  /** Tipo SQL de cada columna de la llave, para comparar el cursor. */
  readonly keyTypes: readonly string[];
  /** Si tiene `updated_at`, la marca de las rondas delta. */
  readonly hasUpdatedAt: boolean;
}
