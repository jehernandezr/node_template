import { createHmac, timingSafeEqual } from 'node:crypto';
import { Pagination } from '@contracts/platform';
import { CriteriaValidator } from './criteria-validator.js';
import {
  MAX_CURSOR_LENGTH,
  MAX_CURSOR_TEXT_LENGTH,
  MAX_CURSOR_VALUES,
  type Cursor,
  type CursorValue,
} from './cursor.js';

/**
 * Codifica y decodifica los cursores de paginación como un token opaco base64url. Se construye una vez con el
 * secreto de firma (HMAC-SHA256, desde `AppConfig`) y se inyecta; sin secreto los tokens no van firmados. La firma
 * va anexada al payload antes de codificar, así el token conserva el alfabeto del contrato.
 */
export class CursorCodec {
  private static readonly TOKEN = new RegExp(Pagination.cursorPattern);
  private static readonly SIGNATURE_BYTES = 32;

  constructor(private readonly secret?: string | Uint8Array) {}

  /**
   * @throws CriteriaError `InvalidValue` si el id o los valores no son válidos o el token superaría `MAX_CURSOR_LENGTH`.
   */
  encode(cursor: Cursor): string {
    if (!CursorCodec.isValidId(cursor.id)) {
      throw CriteriaValidator.invalid(
        `cursor id must be a non-empty string of at most ${MAX_CURSOR_TEXT_LENGTH} characters`,
      );
    }
    if (!CursorCodec.areValidValues(cursor.values)) {
      throw CriteriaValidator.invalid(
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
      throw CriteriaValidator.invalid(
        `cursor exceeds ${MAX_CURSOR_LENGTH} characters`,
      );
    }
    return token;
  }

  /**
   * Valida un token producido por `encode`: rechaza tokens grandes, no canónicos, con claves de más y, si hay
   * secreto, sin firma o con firma que no coincide.
   * @throws CriteriaError `InvalidValue` si el token está mal formado o alterado.
   */
  decode(token: string): Cursor {
    if (
      typeof token !== 'string' ||
      token.length > MAX_CURSOR_LENGTH ||
      !CursorCodec.TOKEN.test(token)
    ) {
      throw CriteriaValidator.invalid('malformed cursor');
    }
    const bytes = Buffer.from(token, 'base64url');
    let payloadBytes = bytes;
    if (this.secret !== undefined) {
      if (bytes.length <= CursorCodec.SIGNATURE_BYTES) {
        throw CriteriaValidator.invalid('malformed cursor');
      }
      payloadBytes = bytes.subarray(
        0,
        bytes.length - CursorCodec.SIGNATURE_BYTES,
      );
      const actual = bytes.subarray(bytes.length - CursorCodec.SIGNATURE_BYTES);
      // Comparación en tiempo constante para que el tiempo de respuesta no revele la firma.
      if (
        !timingSafeEqual(CursorCodec.sign(payloadBytes, this.secret), actual)
      ) {
        throw CriteriaValidator.invalid('malformed cursor');
      }
    }
    let payload: unknown;
    try {
      payload = JSON.parse(payloadBytes.toString('utf8'));
    } catch {
      throw CriteriaValidator.invalid('malformed cursor');
    }
    if (typeof payload !== 'object' || payload === null) {
      throw CriteriaValidator.invalid('malformed cursor');
    }
    const keys = Object.keys(payload);
    const { v, i } = payload as { v?: unknown; i?: unknown };
    if (
      keys.length !== 2 ||
      !CursorCodec.areValidValues(v) ||
      !CursorCodec.isValidId(i)
    ) {
      throw CriteriaValidator.invalid('malformed cursor');
    }
    // Forma canónica: volver a codificar debe dar el mismo payload, así un token tiene una sola representación.
    const canonical = Buffer.from(JSON.stringify({ v, i }), 'utf8');
    if (
      !canonical.equals(payloadBytes) ||
      bytes.toString('base64url') !== token
    ) {
      throw CriteriaValidator.invalid('malformed cursor');
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

  private static sign(payload: Buffer, secret: string | Uint8Array): Buffer {
    return createHmac('sha256', secret).update(payload).digest();
  }
}
