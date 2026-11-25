/** SQLSTATE de Postgres que el código distingue por su significado, no solo por si se reintenta. */
export enum PostgresSqlState {
  /** Otra fila ya tiene esa llave única. */
  UniqueViolation = '23505',
  /** La fila apunta a un padre que no existe, o se borra un padre con hijos. */
  ForeignKeyViolation = '23503',
}
