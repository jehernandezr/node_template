/** Una sentencia de una migración generada, con sus parámetros si el esquema los usa. */
export interface MigrationStatement {
  readonly query: string;
  readonly parameters?: readonly unknown[];
}
