import { invalid } from './validation.js';

/** Keyset position: the sort values of the last row (excluding id) plus its id. */
export interface Cursor {
  readonly values: readonly unknown[];
  readonly id: string;
}

/** Values a cursor may carry. NULL is not supported yet. */
export type CursorValue = string | number | boolean;

const TOKEN = /^[A-Za-z0-9_-]+$/;

function isCursorValue(value: unknown): value is CursorValue {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

/**
 * Encodes a cursor as an opaque base64url token.
 * Values must be non-null strings, finite numbers or booleans. NULL is rejected.
 * @throws CriteriaError with `InvalidValue` for any other input.
 */
export function encodeCursor(cursor: Cursor): string {
  if (typeof cursor.id !== 'string' || cursor.id.length === 0) {
    throw invalid('cursor id must be a non-empty string');
  }
  if (!Array.isArray(cursor.values) || !cursor.values.every(isCursorValue)) {
    throw invalid('cursor values must be strings, finite numbers or booleans');
  }
  return Buffer.from(
    JSON.stringify({ v: cursor.values, i: cursor.id }),
    'utf8',
  ).toString('base64url');
}

/**
 * Decodes and validates a token produced by `encodeCursor`.
 * @throws CriteriaError with `InvalidValue` when the token is malformed.
 */
export function decodeCursor(token: string): Cursor {
  if (typeof token !== 'string' || !TOKEN.test(token)) {
    throw invalid('malformed cursor');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    throw invalid('malformed cursor');
  }
  if (typeof payload !== 'object' || payload === null) {
    throw invalid('malformed cursor');
  }
  const { v, i } = payload as { v?: unknown; i?: unknown };
  if (
    !Array.isArray(v) ||
    !v.every(isCursorValue) ||
    typeof i !== 'string' ||
    i.length === 0
  ) {
    throw invalid('malformed cursor');
  }
  return Object.freeze({ values: Object.freeze([...v]), id: i });
}
