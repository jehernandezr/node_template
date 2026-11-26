import { createHmac, timingSafeEqual } from 'node:crypto';
import { Pagination } from '@contracts/platform';
import { CriteriaError } from './errors/criteria-error.js';
import { CriteriaErrorCode } from './errors/criteria-error-code.enum.js';
import {
  MAX_CURSOR_LENGTH,
  MAX_CURSOR_TEXT_LENGTH,
  MAX_CURSOR_VALUES,
  type Cursor,
  type CursorValue,
} from './cursor.js';

/**
 * Encodes and decodes pagination cursors as an opaque base64url token. Built once with the
 * signing secret (HMAC-SHA256, from `AppConfig`) and injected; without a secret tokens are unsigned. The signature
 * is appended to the payload before encoding, so the token keeps the contract's alphabet.
 */
export class CursorCodec {
  private static readonly TOKEN = new RegExp(Pagination.cursorPattern);
  private static readonly SIGNATURE_BYTES = 32;

  constructor(private readonly secret?: string | Uint8Array) {}

  /**
   * Encodes a cursor as an opaque, canonical and, with a secret, signed token.
   * @param cursor Id and sort values of the last item.
   * @returns The token.
   * @throws CriteriaError `InvalidValue` if the id or the values are invalid or the token would exceed `MAX_CURSOR_LENGTH`.
   */
  encode(cursor: Cursor): string {
    if (!CursorCodec.isValidId(cursor.id)) {
      throw CursorCodec.invalid(
        `cursor id must be a non-empty string of at most ${MAX_CURSOR_TEXT_LENGTH} characters`,
      );
    }
    if (!CursorCodec.areValidValues(cursor.values)) {
      throw CursorCodec.invalid(
        `cursor values must be at most ${MAX_CURSOR_VALUES} strings, finite numbers or booleans`,
      );
    }
    const payload = Buffer.from(
      JSON.stringify({ v: cursor.values, i: cursor.id }),
      'utf8',
    );
    const token = (
      this.secret === undefined
        ? payload
        : Buffer.concat([payload, CursorCodec.sign(payload, this.secret)])
    ).toString('base64url');
    if (token.length > MAX_CURSOR_LENGTH) {
      throw CursorCodec.invalid(
        `cursor exceeds ${MAX_CURSOR_LENGTH} characters`,
      );
    }
    return token;
  }

  /**
   * Validates a token produced by `encode`: rejects tokens that are large, non-canonical, with extra keys and, if there is
   * a secret, unsigned or with a signature that does not match.
   * Constant-time comparison so the response time does not reveal the signature.
   * Canonical form: re-encoding must yield the same payload, so a token has a single representation.
   * @param token Token from the client.
   * @returns The cursor.
   * @throws CriteriaError `InvalidValue` if the token is malformed or tampered with.
   */
  decode(token: string): Cursor {
    if (
      typeof token !== 'string' ||
      token.length > MAX_CURSOR_LENGTH ||
      !CursorCodec.TOKEN.test(token)
    ) {
      throw CursorCodec.invalid('malformed cursor');
    }
    const bytes = Buffer.from(token, 'base64url');
    let payloadBytes = bytes;
    if (this.secret !== undefined) {
      if (bytes.length <= CursorCodec.SIGNATURE_BYTES) {
        throw CursorCodec.invalid('malformed cursor');
      }
      payloadBytes = bytes.subarray(
        0,
        bytes.length - CursorCodec.SIGNATURE_BYTES,
      );
      const actual = bytes.subarray(bytes.length - CursorCodec.SIGNATURE_BYTES);
      if (
        !timingSafeEqual(CursorCodec.sign(payloadBytes, this.secret), actual)
      ) {
        throw CursorCodec.invalid('malformed cursor');
      }
    }
    let payload: unknown;
    try {
      payload = JSON.parse(payloadBytes.toString('utf8'));
    } catch {
      throw CursorCodec.invalid('malformed cursor');
    }
    if (typeof payload !== 'object' || payload === null) {
      throw CursorCodec.invalid('malformed cursor');
    }
    const keys = Object.keys(payload);
    const { v, i } = payload as { v?: unknown; i?: unknown };
    if (
      keys.length !== 2 ||
      !CursorCodec.areValidValues(v) ||
      !CursorCodec.isValidId(i)
    ) {
      throw CursorCodec.invalid('malformed cursor');
    }
    const canonical = Buffer.from(JSON.stringify({ v, i }), 'utf8');
    if (
      !canonical.equals(payloadBytes) ||
      bytes.toString('base64url') !== token
    ) {
      throw CursorCodec.invalid('malformed cursor');
    }
    return Object.freeze({ values: Object.freeze([...v]), id: i });
  }

  private static isCursorValue(value: unknown): value is CursorValue {
    return (
      (typeof value === 'string' && value.length <= MAX_CURSOR_TEXT_LENGTH) ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    );
  }

  private static isValidId(id: unknown): id is string {
    return (
      typeof id === 'string' &&
      id.length > 0 &&
      id.length <= MAX_CURSOR_TEXT_LENGTH
    );
  }

  private static areValidValues(values: unknown): values is CursorValue[] {
    return (
      Array.isArray(values) &&
      values.length <= MAX_CURSOR_VALUES &&
      values.every((value) => CursorCodec.isCursorValue(value))
    );
  }

  private static invalid(message: string): CriteriaError {
    return new CriteriaError(CriteriaErrorCode.InvalidValue, message);
  }

  private static sign(payload: Buffer, secret: string | Uint8Array): Buffer {
    return createHmac('sha256', secret).update(payload).digest();
  }
}
