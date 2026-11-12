/** Límites de la paginación por cursor. */
export const Pagination = {
  /** Tamaño de página cuando la petición no indica `limit`. */
  defaultLimit: 20,
  /** Tamaño de página máximo que acepta una ruta. */
  maxLimit: 100,
  /** Longitud máxima de un cursor opaco. */
  maxCursorLength: 512,
  /** Expresión regular del cursor: base64url sin relleno. */
  cursorPattern: '^[A-Za-z0-9_-]+$',
} as const;
