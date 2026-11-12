import { CursorSchema, Pagination } from '@contracts/platform';
import { decodeCursor, encodeCursor, toPage } from './cursor.js';

describe('cursor', () => {
  const cursor = { values: ['2026-11-12', 3, true], id: 'abc' };

  it('round-trips and produces a token valid for the contract', () => {
    const token = encodeCursor(cursor);
    expect(CursorSchema.safeParse(token).success).toBe(true);
    expect(decodeCursor(token)).toEqual(cursor);
  });

  it('rejects cursors longer than the contract allows', () => {
    expect(() =>
      encodeCursor({
        values: ['x'.repeat(Pagination.maxCursorLength)],
        id: 'a',
      }),
    ).toThrow(/supera/);
  });

  it('rejects invalid values', () => {
    expect(() => encodeCursor({ values: [Number.NaN], id: 'a' })).toThrow();
    expect(() => encodeCursor({ values: [], id: '' })).toThrow();
  });

  it.each([
    '',
    'a+b',
    'x'.repeat(Pagination.maxCursorLength + 1),
    Buffer.from('not json').toString('base64url'),
    Buffer.from('[1]').toString('base64url'),
    Buffer.from('{"v":[null],"i":"a"}').toString('base64url'),
    Buffer.from('{"v":[],"i":""}').toString('base64url'),
  ])('decodes malformed token %s as null', (token) => {
    expect(decodeCursor(token)).toBeNull();
  });
});

describe('toPage', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const cursorOf = (row: { id: string }) => ({ values: [], id: row.id });

  it('returns the next cursor when there is an extra row', () => {
    const page = toPage(rows, 2, cursorOf);
    expect(page.items).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(decodeCursor(page.nextCursor ?? '')?.id).toBe('b');
  });

  it('returns a null cursor on the last page', () => {
    expect(toPage(rows, 3, cursorOf).nextCursor).toBeNull();
  });

  it('bounds the limit', () => {
    expect(() => toPage(rows, 0, cursorOf)).toThrow(/Límite/);
    expect(() => toPage(rows, Pagination.maxLimit + 1, cursorOf)).toThrow();
  });
});
