import { CursorCodec } from '../cursor-codec.js';
import { CriteriaErrorCode } from '../errors/criteria-error-code.enum.js';
import { CriteriaError } from '../errors/criteria-error.js';

function expectCode(fn: () => unknown, code: CriteriaErrorCode): void {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CriteriaError);
  expect((caught as CriteriaError).code).toBe(code);
}

describe('CursorCodec', () => {
  const codec = new CursorCodec();

  it('round-trips values and id through an opaque base64url token', () => {
    const token = codec.encode({ values: ['open', 7, true], id: 'row-42' });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codec.decode(token)).toEqual({
      values: ['open', 7, true],
      id: 'row-42',
    });
  });

  it('accepts an empty value list (id-only ordering)', () => {
    expect(codec.decode(codec.encode({ values: [], id: 'x' }))).toEqual({
      values: [],
      id: 'x',
    });
  });

  it('rejects NULL, objects and non-finite numbers when encoding', () => {
    expectCode(
      () => codec.encode({ values: [null], id: 'x' }),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () => codec.encode({ values: [undefined], id: 'x' }),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () => codec.encode({ values: [{}], id: 'x' }),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () => codec.encode({ values: [Number.NaN], id: 'x' }),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () => codec.encode({ values: [1], id: '' }),
      CriteriaErrorCode.InvalidValue,
    );
  });

  it.each([
    ['non-base64url characters', 'ab cd'],
    ['empty string', ''],
    ['not JSON', Buffer.from('nope', 'utf8').toString('base64url')],
    ['JSON null', Buffer.from('null', 'utf8').toString('base64url')],
    [
      'missing values',
      Buffer.from(JSON.stringify({ i: 'x' }), 'utf8').toString('base64url'),
    ],
    [
      'null inside values',
      Buffer.from(JSON.stringify({ v: [null], i: 'x' }), 'utf8').toString(
        'base64url',
      ),
    ],
    [
      'object inside values',
      Buffer.from(JSON.stringify({ v: [{}], i: 'x' }), 'utf8').toString(
        'base64url',
      ),
    ],
    [
      'empty id',
      Buffer.from(JSON.stringify({ v: [1], i: '' }), 'utf8').toString(
        'base64url',
      ),
    ],
    [
      'numeric id',
      Buffer.from(JSON.stringify({ v: [1], i: 5 }), 'utf8').toString(
        'base64url',
      ),
    ],
  ])('rejects a token with %s', (_name, token) => {
    expectCode(() => codec.decode(token), CriteriaErrorCode.InvalidValue);
  });

  it('rejects a non-string token', () => {
    expectCode(
      () => codec.decode(42 as unknown as string),
      CriteriaErrorCode.InvalidValue,
    );
  });
});
