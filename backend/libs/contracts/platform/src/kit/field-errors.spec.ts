import { z } from 'zod';
import { PlatformErrorCode as C } from '../enums/platform-error-code.enum.js';
import { IdSchema } from '../schemas/id.schema.js';
import { MoneyAmountSchema } from '../schemas/money.schema.js';
import { fieldErrorsFromZod, validateContract } from './field-errors.js';

const Request = z.strictObject({
  id: IdSchema,
  email: z.email(),
  name: z.string().min(2).max(5),
  age: z.int().min(18).max(99),
  tags: z.array(z.string()).max(2),
  role: z.enum({ Admin: 'admin', User: 'user' }),
  price: MoneyAmountSchema,
  active: z.boolean(),
  note: z.string().optional(),
});

const valid = {
  id: '0193f1c2-0000-7000-8000-000000000000',
  email: 'ana@example.com',
  name: 'Ana',
  age: 30,
  tags: ['a'],
  role: 'admin',
  price: { amountMinor: 1500, currency: 'COP' },
  active: true,
};

function codes(input: unknown) {
  const result = validateContract(Request, input);
  return result.ok ? [] : result.errors;
}

describe('validateContract', () => {
  it('returns the parsed value for a valid input', () => {
    const result = validateContract(Request, valid);
    expect(result).toEqual({ ok: true, value: valid });
  });

  it('maps every zod issue to a platform field error', () => {
    const errors = codes({
      id: 'not-a-uuid',
      email: 'nope',
      name: 'A',
      age: 120,
      tags: ['a', 'b', 'c'],
      role: 'owner',
      price: { amountMinor: 1.5 },
      active: 'yes',
      extra: 1,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        { field: 'id', code: C.ValidationInvalidFormat },
        { field: 'email', code: C.ValidationInvalidFormat },
        { field: 'name', code: C.ValidationTooShort },
        { field: 'age', code: C.ValidationTooLarge },
        { field: 'tags', code: C.ValidationTooLong },
        { field: 'role', code: C.ValidationInvalidEnum },
        { field: 'price.amountMinor', code: C.ValidationInvalidType },
        { field: 'price.currency', code: C.ValidationRequired },
        { field: 'active', code: C.ValidationInvalidType },
        { field: 'extra', code: C.ValidationUnknownField },
      ]),
    );
    expect(errors).toHaveLength(10);
  });

  it('reports a missing field as REQUIRED and a short string as TOO_SHORT', () => {
    expect(codes({ ...valid, email: undefined, name: 'Anabelle' })).toEqual([
      { field: 'email', code: C.ValidationRequired },
      { field: 'name', code: C.ValidationTooLong },
    ]);
    expect(codes({ ...valid, age: 10 })).toEqual([
      { field: 'age', code: C.ValidationTooSmall },
    ]);
  });

  it('uses dotted paths with array indexes and omits field at the root', () => {
    const List = z.array(z.object({ n: z.string() }));
    const result = validateContract(List, [{ n: 'a' }, { n: 1 }]);
    expect(result).toEqual({
      ok: false,
      errors: [{ field: '1.n', code: C.ValidationInvalidType }],
    });
    const root = z.string().safeParse(1);
    expect(fieldErrorsFromZod(root.error?.issues ?? [], 1)).toEqual([
      { code: C.ValidationInvalidType },
    ]);
  });

  it('falls back to INVALID_INPUT for custom refinements', () => {
    const Even = z.int().refine((n) => n % 2 === 0);
    expect(validateContract(Even, 3)).toEqual({
      ok: false,
      errors: [{ code: C.ValidationInvalidInput }],
    });
  });
});
