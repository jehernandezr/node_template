import { createHmac, timingSafeEqual } from 'node:crypto';
import { invalid } from './validation.js';

/** Keyset position: the sort values of the last row (excluding id) plus its id. */
export interface Cursor {
  readonly values: readonly unknown[];
  readonly id: string;
}

/** Values a cursor may carry. NULL is not supported yet. */
export type CursorValue = string | number | boolean;

/** Largest encoded token accepted by `decodeCursor` and produced by `encodeCursor`. */
export const MAX_CURSOR_LENGTH = 2048;
/** Largest number of sort values in a cursor. */
export const MAX_CURSOR_VALUES = 16;
/** Largest length of the cursor id and of each string value. */
export const MAX_CURSOR_TEXT_LENGTH = 512;

/** Options to sign cursors so a client cannot forge or alter them. */
export interface CursorOptions {
  /** HMAC-SHA256 key. When set, tokens carry a signature that `decodeCursor` verifies. */
  readonly secret?: string | Uint8Array;
}

const TOKEN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/;

function isCursorValue(value: unknown): value is CursorValue {
  return (
    (typeof value === 'string' && value.length <= MAX_CURSOR_TEXT_LENGTH) ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function isValidId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= MAX_CURSOR_TEXT_LENGTH
  );
}

function areValidValues(values: unknown): values is CursorValue[] {
  return (
    Array.isArray(values) &&
    values.length <= MAX_CURSOR_VALUES &&
    values.every(isCursorValue)
  );
}

function sign(payload: string, secret: string | Uint8Array): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Encodes a cursor as an opaque base64url token (`payload`, or `payload.signature` with a secret).
 * Values must be non-null strings, finite numbers or booleans. NULL is rejected.
 * @throws CriteriaError with `InvalidValue` for any other input or when the token would exceed `MAX_CURSOR_LENGTH`.
 */
export function encodeCursor(
  cursor: Cursor,
  options: CursorOptions = {},
): string {
  if (!isValidId(cursor.id)) {
    throw invalid(
      `cursor id must be a non-empty string of at most ${MAX_CURSOR_TEXT_LENGTH} characters`,
    );
  }
  if (!areValidValues(cursor.values)) {
    throw invalid(
      `cursor values must be at most ${MAX_CURSOR_VALUES} strings, finite numbers or booleans`,
    );
  }
  const payload = Buffer.from(
    JSON.stringify({ v: cursor.values, i: cursor.id }),
    'utf8',
  ).toString('base64url');
  const token =
    options.secret === undefined
      ? payload
      : `${payload}.${sign(payload, options.secret)}`;
  if (token.length > MAX_CURSOR_LENGTH) {
    throw invalid(`cursor exceeds ${MAX_CURSOR_LENGTH} characters`);
  }
  return token;
}

/**
 * Decodes and validates a token produced by `encodeCursor`.
 * Rejects oversized tokens, non-canonical encodings, unknown keys and, when a secret is given,
 * a missing or wrong signature.
 * @throws CriteriaError with `InvalidValue` when the token is malformed or tampered with.
 */
export function decodeCursor(
  token: string,
  options: CursorOptions = {},
): Cursor {
  if (
    typeof token !== 'string' ||
    token.length > MAX_CURSOR_LENGTH ||
    !TOKEN.test(token)
  ) {
    throw invalid('malformed cursor');
  }
  const [payloadPart, signature] = token.split('.') as [
    string,
    string | undefined,
  ];
  if (options.secret !== undefined) {
    if (signature === undefined) {
      throw invalid('malformed cursor');
    }
    const expected = Buffer.from(sign(payloadPart, options.secret));
    const actual = Buffer.from(signature);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw invalid('malformed cursor');
    }
  } else if (signature !== undefined) {
    throw invalid('malformed cursor');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    );
  } catch {
    throw invalid('malformed cursor');
  }
  if (typeof payload !== 'object' || payload === null) {
    throw invalid('malformed cursor');
  }
  const keys = Object.keys(payload);
  const { v, i } = payload as { v?: unknown; i?: unknown };
  if (keys.length !== 2 || !areValidValues(v) || !isValidId(i)) {
    throw invalid('malformed cursor');
  }
  // Canonical form: re-encoding must give back the same payload.
  const canonical = Buffer.from(JSON.stringify({ v, i }), 'utf8').toString(
    'base64url',
  );
  if (canonical !== payloadPart) {
    throw invalid('malformed cursor');
  }
  return Object.freeze({ values: Object.freeze([...v]), id: i });
}
