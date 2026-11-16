import { z } from 'zod';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { JsonSafetyChecker } from '../json-safety-checker.js';
import type { OperationSchemas } from '../operation-schemas.js';

const checker = new JsonSafetyChecker();

function contractWith(input: z.ZodType, output: z.ZodType): OperationSchemas {
  return { input, output };
}

describe('JsonSafetyChecker', () => {
  it('accepts plain object, array, optional and enum schemas', () => {
    const contract = contractWith(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
        note: z.string().optional(),
        kind: z.enum(['a', 'b']),
      }),
      z.object({
        ok: z.boolean(),
        nested: z.object({ count: z.number().int() }),
      }),
    );
    expect(() => checker.assertSafe(contract)).not.toThrow();
  });

  it('rejects a transform in the input', () => {
    const contract = contractWith(
      z.object({ amount: z.string().transform(Number) }),
      z.object({}),
    );
    expect(() => checker.assertSafe(contract, 'billing.x.v1')).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.NonJsonSafeSchema,
      }),
    );
  });

  it('rejects a pipe in the output, even when nested', () => {
    const contract = contractWith(
      z.object({}),
      z.object({
        items: z.array(z.object({ value: z.string().pipe(z.string()) })),
      }),
    );
    expect(() => checker.assertSafe(contract)).toThrow(
      /output schema uses "pipe"/,
    );
  });

  it('rejects z.date() in the output', () => {
    const contract = contractWith(z.object({}), z.object({ at: z.date() }));
    expect(() => checker.assertSafe(contract)).toThrow(/uses "date"/);
  });

  it('rejects z.coerce.date() in the input', () => {
    const contract = contractWith(
      z.object({ at: z.coerce.date() }),
      z.object({}),
    );
    expect(() => checker.assertSafe(contract)).toThrow(
      /input schema uses "date"/,
    );
  });
});
