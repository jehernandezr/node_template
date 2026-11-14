import { CursorSchema, Pagination, pageOf } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import {
  MAX_CURSOR_LENGTH,
  MAX_CURSOR_TEXT_LENGTH,
  MAX_CURSOR_VALUES,
  decodeCursor,
  encodeCursor,
} from './cursor.js';
import { z } from 'zod';
import { CriteriaErrorCode } from './enums.js';
import { MAX_LIMIT } from './validation.js';
import { CriteriaError } from './errors.js';

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function codeOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CriteriaError);
    expect(error).toBeInstanceOf(PlatformError);
    return (error as CriteriaError).code;
  }
  return undefined;
}

describe('cursor bounds and tampering', () => {
  it('rejects tokens longer than the maximum before decoding', () => {
    const token = 'A'.repeat(MAX_CURSOR_LENGTH + 1);
    expect(codeOf(() => decodeCursor(token))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
  });

  it('uses the limits of the pagination contract', () => {
    expect(MAX_CURSOR_LENGTH).toBe(Pagination.maxCursorLength);
    expect(MAX_LIMIT).toBe(Pagination.maxLimit);
  });

  it('rejects encoding oversized ids, texts, value lists and tokens', () => {
    const long = 'x'.repeat(MAX_CURSOR_TEXT_LENGTH + 1);
    expect(codeOf(() => encodeCursor({ values: [], id: long }))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(codeOf(() => encodeCursor({ values: [long], id: 'a' }))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(
      codeOf(() =>
        encodeCursor({
          values: new Array(MAX_CURSOR_VALUES + 1).fill(1),
          id: 'a',
        }),
      ),
    ).toBe(CriteriaErrorCode.InvalidValue);
    const big = 'y'.repeat(MAX_CURSOR_TEXT_LENGTH);
    expect(
      codeOf(() => encodeCursor({ values: [big, big, big], id: 'a' })),
    ).toBe(CriteriaErrorCode.InvalidValue);
  });

  it('rejects decoded payloads with too many values or long strings', () => {
    expect(
      codeOf(() =>
        decodeCursor(
          b64({ v: new Array(MAX_CURSOR_VALUES + 1).fill(1), i: 'a' }),
        ),
      ),
    ).toBe(CriteriaErrorCode.InvalidValue);
    expect(
      codeOf(() =>
        decodeCursor(b64({ v: [], i: 'a'.repeat(MAX_CURSOR_TEXT_LENGTH + 1) })),
      ),
    ).toBe(CriteriaErrorCode.InvalidValue);
  });

  it('rejects extra keys and non-canonical payloads', () => {
    expect(codeOf(() => decodeCursor(b64({ v: [], i: 'a', x: 1 })))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(codeOf(() => decodeCursor(b64({ i: 'a', v: [] })))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(codeOf(() => decodeCursor(`${b64({ v: [], i: 'a' })}A`))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
  });

  describe('signed cursors', () => {
    const secret = 'unit-test-key';
    const cursor = { values: ['open', 3], id: 'row-1' };

    it('round-trips with the same secret', () => {
      const token = encodeCursor(cursor, { secret });
      expect(decodeCursor(token, { secret })).toEqual(cursor);
    });

    it('rejects a modified payload, a wrong secret and a missing signature', () => {
      const token = encodeCursor(cursor, { secret });
      const signature = Buffer.from(token, 'base64url').subarray(-32);
      const forged = Buffer.concat([
        Buffer.from(JSON.stringify({ v: ['open', 4], i: 'row-1' })),
        signature,
      ]).toString('base64url');
      expect(codeOf(() => decodeCursor(forged, { secret }))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => decodeCursor(token, { secret: 'other' }))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => decodeCursor(encodeCursor(cursor), { secret }))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('keeps a signed cursor inside the pagination contract', () => {
      const token = encodeCursor(cursor, { secret });
      expect(token).not.toContain('.');
      expect(CursorSchema.safeParse(token).success).toBe(true);
      expect(
        pageOf(z.string()).safeParse({ items: ['a'], nextCursor: token })
          .success,
      ).toBe(true);
    });

    it('rejects a token that is too short to hold a signature', () => {
      expect(codeOf(() => decodeCursor('QUJD', { secret }))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('rejects a signed token when no secret is configured', () => {
      expect(codeOf(() => decodeCursor(encodeCursor(cursor, { secret })))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });
});
