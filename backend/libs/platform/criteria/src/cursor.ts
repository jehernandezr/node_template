import { Pagination } from '@contracts/platform';

/** Keyset position: the sort values of the last row (without the id) and its id. */
export interface Cursor {
  readonly values: readonly unknown[];
  readonly id: string;
}

/** Values a cursor can carry. NULL is not supported yet. */
export type CursorValue = string | number | boolean;

/** Longest token the decoder accepts and the encoder produces. Matches the contract. */
export const MAX_CURSOR_LENGTH = Pagination.maxCursorLength;
/** Maximum number of sort values in a cursor. */
export const MAX_CURSOR_VALUES = 16;
/** Maximum length of the cursor id and of each text value. */
export const MAX_CURSOR_TEXT_LENGTH = 512;
