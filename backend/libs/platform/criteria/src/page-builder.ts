import type { CursorCodec } from './cursor-codec.js';
import { CriteriaValidator } from './criteria-validator.js';
import type { Page } from './page.js';

/** Arma una página de resultados y el cursor siguiente con el `CursorCodec` que recibe. */
export class PageBuilder {
  constructor(private readonly codec: CursorCodec) {}

  /**
   * Aplica el límite original a las filas leídas con `limit + 1`: una fila de más significa que hay otra página,
   * se descarta y el cursor apunta a la última fila que se queda.
   * @param getSortValues valores de los campos de `orderBy` distintos del id, en el mismo orden. No pueden ser nulos.
   * @throws CriteriaError `InvalidLimit` si `limit` no es un entero entre 1 y `MAX_LIMIT`.
   */
  build<T>(
    rows: readonly T[],
    limit: number | undefined,
    getId: (row: T) => string,
    getSortValues: (row: T) => readonly unknown[],
  ): Page<T> {
    if (limit === undefined) {
      return { items: [...rows], nextCursor: null };
    }
    CriteriaValidator.limit(limit);
    if (rows.length <= limit) {
      return { items: [...rows], nextCursor: null };
    }
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: this.codec.encode({
        values: getSortValues(last),
        id: getId(last),
      }),
    };
  }
}
