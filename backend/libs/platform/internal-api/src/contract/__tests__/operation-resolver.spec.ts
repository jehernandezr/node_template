import {
  Compensation,
  defineOperation,
  type OperationDefinition,
} from '@contracts/platform';
import { z } from 'zod';
import { InternalApiError } from '../../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { OperationMetadata } from '../operation-metadata.js';
import { OperationResolver } from '../operation-resolver.js';

const Reserve = defineOperation({
  id: 'billing.reserve.v1',
  description: 'Reserves funds',
  compensatedBy: 'billing.release.v1',
  idempotent: true,
  errors: ['BILLING.FUNDS.NOT_ENOUGH'],
  input: z.object({ amount: z.number() }),
  output: z.object({ id: z.string() }),
});

const SendMail = defineOperation({
  id: 'mail.message.send.v1',
  description: 'Sends an email',
  compensatedBy: Compensation.None,
  compensationReason: 'Email cannot be unsent',
  idempotent: true,
  input: z.object({ to: z.string() }),
  output: z.object({ ok: z.boolean() }),
});

describe('OperationResolver', () => {
  const resolver = new OperationResolver();

  it('normalizes the metadata of a descriptor', () => {
    expect(resolver.resolve(Reserve).metadata).toEqual({
      id: 'billing.reserve.v1',
      compensatedBy: 'billing.release.v1',
      idempotent: true,
      errors: ['BILLING.FUNDS.NOT_ENOUGH'],
      mutating: true,
    });
    const { metadata } = resolver.resolve(SendMail);
    expect(metadata.compensationReason).toBe('Email cannot be unsent');
    expect(metadata.errors).toEqual([]);
  });

  it('keeps the schemas and caches the descriptor per resolver', () => {
    const descriptor = resolver.resolve(Reserve);
    expect(descriptor.input).toBe(Reserve.input);
    expect(descriptor.output).toBe(Reserve.output);
    expect(resolver.resolve(Reserve)).toBe(descriptor);
    expect(new OperationResolver().resolve(Reserve)).not.toBe(descriptor);
  });

  it('exposes immutable metadata', () => {
    const { metadata } = resolver.resolve(Reserve);
    expect(metadata).toBeInstanceOf(OperationMetadata);
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(metadata.errors)).toBe(true);
  });

  it('throws InvalidOperation for something that is not a descriptor', () => {
    expect(() =>
      resolver.resolve({ id: 'x' } as unknown as OperationDefinition),
    ).toThrow(
      expect.objectContaining({ code: InternalApiErrorCode.InvalidOperation }),
    );
  });

  it('throws MissingCompensation when Compensation.None has no reason', () => {
    const unchecked = {
      ...Reserve,
      compensatedBy: Compensation.None,
      compensationReason: '  ',
    } as OperationDefinition;

    expect(() => resolver.resolve(unchecked)).toThrow(InternalApiError);
    expect(() => resolver.resolve(unchecked)).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.MissingCompensation,
      }),
    );
  });
});
