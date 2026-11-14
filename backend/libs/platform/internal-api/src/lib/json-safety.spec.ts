import { PlatformErrorCode } from '@contracts/platform';
import { z } from 'zod';
import type { OperationSchemas } from './contract.js';
import { assertJsonSafeContract } from './json-safety.js';

function contractWith(input: z.ZodType, output: z.ZodType): OperationSchemas {
  return { input, output };
}

describe('assertJsonSafeContract', () => {
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
    expect(() => assertJsonSafeContract(contract)).not.toThrow();
  });

  it('rejects a transform in the input', () => {
    const contract = contractWith(
      z.object({ amount: z.string().transform(Number) }),
      z.object({}),
    );
    expect(() => assertJsonSafeContract(contract, 'billing.x.v1')).toThrow(
      expect.objectContaining({
        code: PlatformErrorCode.InternalApiNonJsonSafeSchema,
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
    expect(() => assertJsonSafeContract(contract)).toThrow(
      /output schema uses "pipe"/,
    );
  });

  it('rejects z.date() in the output', () => {
    const contract = contractWith(z.object({}), z.object({ at: z.date() }));
    expect(() => assertJsonSafeContract(contract)).toThrow(/uses "date"/);
  });

  it('rejects z.coerce.date() in the input', () => {
    const contract = contractWith(
      z.object({ at: z.coerce.date() }),
      z.object({}),
    );
    expect(() => assertJsonSafeContract(contract)).toThrow(
      /input schema uses "date"/,
    );
  });
});
