import type { Page as ContractPage } from '@contracts/platform';
import { CursorCodec } from '../cursor-codec.js';
import { CriteriaErrorCode } from '../errors/criteria-error-code.enum.js';
import { CriteriaError } from '../errors/criteria-error.js';
import { PageBuilder } from '../page-builder.js';
import type { Page } from '../page.js';

const getId = (row: { id: string }): string => row.id;
const getValues = (row: { id: string; priority: number }): unknown[] => [
  row.priority,
];

describe('PageBuilder', () => {
  const codec = new CursorCodec();
  const builder = new PageBuilder(codec);
  const rows = [
    { id: 'a', priority: 3 },
    { id: 'b', priority: 2 },
    { id: 'c', priority: 1 },
  ];

  it('drops the extra row and points the cursor at the last kept row', () => {
    const page = builder.build(rows, 2, getId, getValues);
    expect(page.items).toEqual([rows[0], rows[1]]);
    expect(page.nextCursor).not.toBeNull();
    expect(codec.decode(page.nextCursor as string)).toEqual({
      values: [2],
      id: 'b',
    });
  });

  it('has no next page when the rows fit within the limit', () => {
    expect(builder.build(rows.slice(0, 2), 2, getId, getValues)).toEqual({
      items: [rows[0], rows[1]],
      nextCursor: null,
    });
  });

  it('returns every row and no cursor when there is no limit', () => {
    expect(builder.build(rows, undefined, getId, getValues)).toEqual({
      items: rows,
      nextCursor: null,
    });
  });

  it('returns an empty page when there are no rows', () => {
    expect(builder.build([], 5, getId, getValues)).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('returns a copy, not the input array', () => {
    expect(builder.build(rows, 10, getId, getValues).items).not.toBe(rows);
  });

  it('signs the cursor with the codec it receives', () => {
    const signed = new PageBuilder(new CursorCodec('page-secret'));
    const page = signed.build(rows, 2, getId, getValues);
    expect(() =>
      new CursorCodec('other-secret').decode(page.nextCursor as string),
    ).toThrow(CriteriaError);
    expect(
      new CursorCodec('page-secret').decode(page.nextCursor as string),
    ).toEqual({ values: [2], id: 'b' });
  });

  it('rejects a limit outside 1 to 100 with InvalidLimit', () => {
    let caught: unknown;
    try {
      builder.build(rows, 0, getId, getValues);
    } catch (error) {
      caught = error;
    }
    expect((caught as CriteriaError).code).toBe(CriteriaErrorCode.InvalidLimit);
  });

  it('builds a page that satisfies the contract Page type', () => {
    const page: Page<{ id: string; priority: number }> = builder.build(
      rows,
      2,
      getId,
      getValues,
    );
    const asContract: ContractPage<{ id: string; priority: number }> =
      page satisfies ContractPage<{ id: string; priority: number }>;
    expect(asContract.items).toHaveLength(2);
    expect(asContract.nextCursor).toEqual(page.nextCursor);
  });
});
