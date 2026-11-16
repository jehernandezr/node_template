import { Pagination } from '@contracts/platform';

/** Posición de keyset: los valores de orden de la última fila (sin el id) y su id. */
export interface Cursor {
  readonly values: readonly unknown[];
  readonly id: string;
}

/** Valores que puede llevar un cursor. El NULL todavía no se admite. */
export type CursorValue = string | number | boolean;

/** Token más largo que acepta el decodificador y produce el codificador. Coincide con el contrato. */
export const MAX_CURSOR_LENGTH = Pagination.maxCursorLength;
/** Número máximo de valores de orden en un cursor. */
export const MAX_CURSOR_VALUES = 16;
/** Longitud máxima del id del cursor y de cada valor de texto. */
export const MAX_CURSOR_TEXT_LENGTH = 512;
