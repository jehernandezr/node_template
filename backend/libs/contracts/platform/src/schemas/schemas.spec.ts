import { z } from 'zod';
import { Pagination } from '../constants/pagination.constants.js';
import { platformContract } from '../contract.js';
import { EmptySchema } from './empty.schema.js';
import { IdSchema } from './id.schema.js';
import { MoneyAmountSchema } from './money.schema.js';
import { CursorSchema, PageQuerySchema, pageOf } from './pagination.schema.js';

describe('platform schemas', () => {
  it('accepts only UUIDv7 identifiers', () => {
    expect(
      IdSchema.safeParse('0193f1c2-0000-7000-8000-000000000000').success,
    ).toBe(true);
    expect(
      IdSchema.safeParse('0193f1c2-0000-4000-8000-000000000000').success,
    ).toBe(false);
  });

  it('bounds the cursor length and alphabet', () => {
    expect(CursorSchema.safeParse('abc_-9').success).toBe(true);
    expect(CursorSchema.safeParse('a+b').success).toBe(false);
    expect(CursorSchema.safeParse('').success).toBe(false);
    expect(
      CursorSchema.safeParse('a'.repeat(Pagination.maxCursorLength + 1))
        .success,
    ).toBe(false);
  });

  it('bounds the page limit and rejects unknown query fields', () => {
    expect(PageQuerySchema.safeParse({}).success).toBe(true);
    expect(PageQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(PageQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(PageQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(PageQuerySchema.safeParse({ offset: 1 }).success).toBe(false);
  });

  it('builds pages of any item', () => {
    const Page = pageOf(z.string(), 'Página de textos.');
    expect(Page.parse({ items: ['a'], nextCursor: null })).toEqual({
      items: ['a'],
      nextCursor: null,
    });
    expect(Page.description).toBe('Página de textos.');
  });

  it('accepts money only in integer minor units with an ISO currency', () => {
    expect(
      MoneyAmountSchema.safeParse({ amountMinor: 150, currency: 'COP' })
        .success,
    ).toBe(true);
    expect(
      MoneyAmountSchema.safeParse({ amountMinor: 1.5, currency: 'COP' })
        .success,
    ).toBe(false);
    expect(
      MoneyAmountSchema.safeParse({ amountMinor: 1, currency: 'cop' }).success,
    ).toBe(false);
  });

  it('rejects any field in the empty request', () => {
    expect(EmptySchema.safeParse({}).success).toBe(true);
    expect(EmptySchema.safeParse({ a: 1 }).success).toBe(false);
  });

  it('registers every transversal schema in the platform contract', () => {
    expect(Object.keys(platformContract.schemas)).toEqual(
      expect.arrayContaining([
        'Id',
        'PageQuery',
        'MoneyAmount',
        'ProblemDetails',
      ]),
    );
  });
});
