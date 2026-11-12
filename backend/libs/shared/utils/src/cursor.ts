import { CursorSchema, Pagination, type Page } from '@contracts/platform';

/** Posición de una página: valores de orden de la última fila y su id. */
export interface PageCursor {
  readonly values: readonly (string | number | boolean)[];
  readonly id: string;
}

function isValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

/**
 * Codifica un cursor como base64url. Lanza `RangeError` si el resultado supera
 * `Pagination.maxCursorLength`, el mismo límite que valida el contrato.
 */
export function encodeCursor(cursor: PageCursor): string {
  if (!cursor.id || !cursor.values.every(isValue)) {
    throw new RangeError('Cursor inválido');
  }
  const token = Buffer.from(
    JSON.stringify({ v: cursor.values, i: cursor.id }),
    'utf8',
  ).toString('base64url');
  if (token.length > Pagination.maxCursorLength) {
    throw new RangeError(
      `El cursor supera ${Pagination.maxCursorLength} caracteres`,
    );
  }
  return token;
}

/** Decodifica un cursor. Devuelve null si el token no cumple el contrato o está mal formado. */
export function decodeCursor(token: string): PageCursor | null {
  if (!CursorSchema.safeParse(token).success) return null;
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8'),
    );
    if (typeof payload !== 'object' || payload === null) return null;
    const { v, i } = payload as { v?: unknown; i?: unknown };
    if (!Array.isArray(v) || !v.every(isValue)) return null;
    if (typeof i !== 'string' || i.length === 0) return null;
    return Object.freeze({ values: Object.freeze([...v]), id: i });
  } catch {
    return null;
  }
}

/**
 * Arma una página a partir de `limit + 1` filas: si sobra una, hay página
 * siguiente y su cursor apunta a la última fila devuelta.
 */
export function toPage<T>(
  rows: readonly T[],
  limit: number,
  cursorOf: (row: T) => PageCursor,
): Page<T> {
  if (!Number.isInteger(limit) || limit < 1 || limit > Pagination.maxLimit) {
    throw new RangeError(`Límite inválido: ${limit}`);
  }
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const nextCursor =
    rows.length > limit && last !== undefined
      ? encodeCursor(cursorOf(last))
      : null;
  return { items, nextCursor };
}
