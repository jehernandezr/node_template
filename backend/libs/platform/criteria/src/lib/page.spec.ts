import { decodeCursor } from './cursor.js';
import { CriteriaErrorCode } from './enums.js';
import { CriteriaError } from './errors.js';
import { takePage } from './page.js';

const getId = (row: { id: string }): string => row.id;
const getValues = (row: { id: string; priority: number }): unknown[] => [
  row.priority,
];

describe('takePage', () => {
  const rows = [
    { id: 'a', priority: 3 },
    { id: 'b', priority: 2 },
    { id: 'c', priority: 1 },
  ];

  it('drops the extra row and points the cursor at the last kept row', () => {
    const page = takePage(rows, 2, getId, getValues);
    expect(page.items).toEqual([rows[0], rows[1]]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor as string)).toEqual({
      values: [2],
      id: 'b',
    });
  });

  it('has no next page when the rows fit within the limit', () => {
    expect(takePage(rows.slice(0, 2), 2, getId, getValues)).toEqual({
      items: [rows[0], rows[1]],
      nextCursor: null,
    });
  });

  it('returns every row and no cursor when there is no limit', () => {
    expect(takePage(rows, undefined, getId, getValues)).toEqual({
      items: rows,
      nextCursor: null,
    });
  });

  it('returns an empty page when there are no rows', () => {
    expect(takePage([], 5, getId, getValues)).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('returns a copy, not the input array', () => {
    expect(takePage(rows, 10, getId, getValues).items).not.toBe(rows);
  });

  it('rejects a limit outside 1 to 1000 with InvalidLimit', () => {
    let caught: unknown;
    try {
      takePage(rows, 0, getId, getValues);
    } catch (error) {
      caught = error;
    }
    expect((caught as CriteriaError).code).toBe(CriteriaErrorCode.InvalidLimit);
  });
});
