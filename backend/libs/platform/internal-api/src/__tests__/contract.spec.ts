import {
  defineOperation,
  PlatformErrorCode,
  type OperationDefinition,
} from '@contracts/platform';
import { z } from 'zod';
import {
  Compensation,
  allowedErrorCodes,
  effectiveAttempts,
  effectiveTimeout,
  resolveOperation,
} from '../contract.js';
import { InternalApiError } from '../errors.js';

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

describe('resolveOperation', () => {
  it('normalizes the metadata of a descriptor', () => {
    expect(resolveOperation(Reserve).metadata).toEqual({
      id: 'billing.reserve.v1',
      compensatedBy: 'billing.release.v1',
      idempotent: true,
      errors: ['BILLING.FUNDS.NOT_ENOUGH'],
      mutating: true,
    });
    const metadata = resolveOperation(SendMail).metadata;
    expect(metadata.compensationReason).toBe('Email cannot be unsent');
    expect(metadata.errors).toEqual([]);
  });

  it('keeps the schemas and caches the descriptor', () => {
    const descriptor = resolveOperation(Reserve);
    expect(descriptor.input).toBe(Reserve.input);
    expect(descriptor.output).toBe(Reserve.output);
    expect(resolveOperation(Reserve)).toBe(descriptor);
  });

  it('exposes metadata as frozen', () => {
    const { metadata } = resolveOperation(Reserve);
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(metadata.errors)).toBe(true);
  });

  it('throws InvalidOperation for something that is not a descriptor', () => {
    expect(() =>
      resolveOperation({ id: 'x' } as unknown as OperationDefinition),
    ).toThrow(
      expect.objectContaining({
        code: PlatformErrorCode.InternalApiInvalidOperation,
      }),
    );
  });

  it('throws MissingCompensation when Compensation.None has no reason', () => {
    const unchecked = {
      ...Reserve,
      compensatedBy: Compensation.None,
      compensationReason: '  ',
    } as OperationDefinition;
    expect(() => resolveOperation(unchecked)).toThrow(InternalApiError);
    expect(() => resolveOperation(unchecked)).toThrow(
      expect.objectContaining({
        code: PlatformErrorCode.InternalApiMissingCompensation,
      }),
    );
  });

  it('exposes the effective attempts, timeout and allowed codes', () => {
    const { metadata } = resolveOperation(Reserve);
    expect(effectiveAttempts(metadata)).toBe(3);
    expect(effectiveTimeout(metadata)).toBe(5000);
    expect([...allowedErrorCodes(metadata)].sort()).toEqual([
      'BILLING.FUNDS.NOT_ENOUGH',
      PlatformErrorCode.ValidationInvalidInput,
    ]);
  });
});
