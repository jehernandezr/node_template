import { CursorSchema, Pagination, pageOf } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { z } from 'zod';
import { CursorCodec } from '../cursor-codec.js';
import {
  MAX_CURSOR_LENGTH,
  MAX_CURSOR_TEXT_LENGTH,
  MAX_CURSOR_VALUES,
} from '../cursor.js';
import { CriteriaErrorCode } from '../errors/criteria-error-code.enum.js';
import { CriteriaError } from '../errors/criteria-error.js';

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
  const codec = new CursorCodec();

  it('rejects tokens longer than the maximum before decoding', () => {
    const token = 'A'.repeat(MAX_CURSOR_LENGTH + 1);
    expect(codeOf(() => codec.decode(token))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
  });

  it('uses the cursor length limit of the pagination contract', () => {
    expect(MAX_CURSOR_LENGTH).toBe(Pagination.maxCursorLength);
  });

  it('rejects encoding oversized ids, texts, value lists and tokens', () => {
    const long = 'x'.repeat(MAX_CURSOR_TEXT_LENGTH + 1);
    expect(codeOf(() => codec.encode({ values: [], id: long }))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(codeOf(() => codec.encode({ values: [long], id: 'a' }))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(
      codeOf(() =>
        codec.encode({
          values: new Array(MAX_CURSOR_VALUES + 1).fill(1),
          id: 'a',
        }),
      ),
    ).toBe(CriteriaErrorCode.InvalidValue);
    const big = 'y'.repeat(MAX_CURSOR_TEXT_LENGTH);
    expect(
      codeOf(() => codec.encode({ values: [big, big, big], id: 'a' })),
    ).toBe(CriteriaErrorCode.InvalidValue);
  });

  it('rejects decoded payloads with too many values or long strings', () => {
    expect(
      codeOf(() =>
        codec.decode(
          b64({ v: new Array(MAX_CURSOR_VALUES + 1).fill(1), i: 'a' }),
        ),
      ),
    ).toBe(CriteriaErrorCode.InvalidValue);
    expect(
      codeOf(() =>
        codec.decode(b64({ v: [], i: 'a'.repeat(MAX_CURSOR_TEXT_LENGTH + 1) })),
      ),
    ).toBe(CriteriaErrorCode.InvalidValue);
  });

  it('rejects extra keys and non-canonical payloads', () => {
    expect(codeOf(() => codec.decode(b64({ v: [], i: 'a', x: 1 })))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(codeOf(() => codec.decode(b64({ i: 'a', v: [] })))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
    expect(codeOf(() => codec.decode(`${b64({ v: [], i: 'a' })}A`))).toBe(
      CriteriaErrorCode.InvalidValue,
    );
  });

  describe('signed cursors', () => {
    const secret = 'unit-test-key';
    const signed = new CursorCodec(secret);
    const cursor = { values: ['open', 3], id: 'row-1' };

    it('round-trips with the same secret', () => {
      const token = signed.encode(cursor);
      expect(signed.decode(token)).toEqual(cursor);
    });

    it('rejects a modified payload, a wrong secret and a missing signature', () => {
      const token = signed.encode(cursor);
      const signature = Buffer.from(token, 'base64url').subarray(-32);
      const forged = Buffer.concat([
        Buffer.from(JSON.stringify({ v: ['open', 4], i: 'row-1' })),
        signature,
      ]).toString('base64url');
      expect(codeOf(() => signed.decode(forged))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => new CursorCodec('other').decode(token))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => signed.decode(codec.encode(cursor)))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('keeps a signed cursor inside the pagination contract', () => {
      const token = signed.encode(cursor);
      expect(token).not.toContain('.');
      expect(CursorSchema.safeParse(token).success).toBe(true);
      expect(
        pageOf(z.string()).safeParse({ items: ['a'], nextCursor: token })
          .success,
      ).toBe(true);
    });

    it('rejects a token that is too short to hold a signature', () => {
      expect(codeOf(() => signed.decode('QUJD'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('rejects a signed token when no secret is configured', () => {
      expect(codeOf(() => codec.decode(signed.encode(cursor)))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('rejects a token with one character changed in the signature', () => {
      const token = signed.encode(cursor);
      const bytes = Buffer.from(token, 'base64url');
      bytes[bytes.length - 1] ^= 0x01;
      expect(codeOf(() => signed.decode(bytes.toString('base64url')))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });
});
