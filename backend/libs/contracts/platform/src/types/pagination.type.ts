/** Parámetros de una petición paginada por cursor. */
export interface PageQuery {
  /** Tamaño de página, entre 1 y `Pagination.maxLimit`. */
  limit?: number;
  /** Cursor opaco devuelto por la página anterior. */
  after?: string;
}

/** Página de resultados. `nextCursor` es null en la última página. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
