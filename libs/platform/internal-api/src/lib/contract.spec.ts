import { z } from 'zod';
import {
  Compensation,
  Operation,
  OperationContract,
  allowedErrorCodes,
  effectiveAttempts,
  effectiveTimeout,
  getOperationMetadata,
} from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';

@Operation({
  id: 'billing.reserve.v1',
  compensatedBy: 'billing.release.v1',
  idempotent: true,
  errors: ['NO_FUNDS'],
})
class Reserve extends OperationContract<{ amount: number }, { id: string }> {
  readonly input = z.object({ amount: z.number() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'mail.send.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Email cannot be unsent',
  idempotent: true,
  mutating: false,
})
class SendMail extends OperationContract<{ to: string }, { ok: boolean }> {
  readonly input = z.object({ to: z.string() });
  readonly output = z.object({ ok: z.boolean() });
}

class Undecorated extends OperationContract<unknown, unknown> {
  readonly input = z.unknown();
  readonly output = z.unknown();
}

class InheritsReserve extends Reserve {}

describe('@Operation', () => {
  it('stores metadata with mutating and errors defaults', () => {
    expect(getOperationMetadata(Reserve)).toEqual({
      id: 'billing.reserve.v1',
      compensatedBy: 'billing.release.v1',
      idempotent: true,
      errors: ['NO_FUNDS'],
      mutating: true,
    });
  });

  it('keeps an explicit mutating flag and an empty errors list by default', () => {
    const metadata = getOperationMetadata(SendMail);
    expect(metadata?.mutating).toBe(false);
    expect(metadata?.compensationReason).toBe('Email cannot be unsent');
    expect(getOperationMetadata(SendMail)?.errors).toEqual([]);
  });

  it('stores metadata under Symbol.for so it survives module boundaries', () => {
    const key = Symbol.for('platform.internal-api.operation');
    expect(Reflect.get(Reserve, key)).toBe(getOperationMetadata(Reserve));
    expect(Reflect.get(Reserve, key)).toMatchObject({
      id: 'billing.reserve.v1',
    });
  });

  it('does not expose metadata as an enumerable property', () => {
    expect(Object.getOwnPropertySymbols(Reserve)).toContain(
      Symbol.for('platform.internal-api.operation'),
    );
    expect(
      Object.getOwnPropertyDescriptor(
        Reserve,
        Symbol.for('platform.internal-api.operation'),
      )?.enumerable,
    ).toBe(false);
  });

  it('returns undefined for a class without the decorator', () => {
    expect(getOperationMetadata(Undecorated)).toBeUndefined();
  });

  it('ignores metadata inherited from a decorated parent class', () => {
    expect(getOperationMetadata(InheritsReserve)).toBeUndefined();
  });

  it('exposes metadata as frozen', () => {
    const metadata = getOperationMetadata(Reserve);
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(metadata?.errors)).toBe(true);
  });

  it('throws MissingCompensation when Compensation.None has no reason, at decoration time', () => {
    expect(() =>
      Operation({
        id: 'a.b.v1',
        compensatedBy: Compensation.None,
        idempotent: true,
      }),
    ).toThrow(InternalApiError);
    expect(() =>
      Operation({
        id: 'a.b.v1',
        compensatedBy: Compensation.None,
        compensationReason: '  ',
        idempotent: true,
      }),
    ).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.MissingCompensation,
      }),
    );
  });

  it('exposes the effective attempts, timeout and allowed codes', () => {
    const metadata = getOperationMetadata(Reserve);
    expect(metadata && effectiveAttempts(metadata)).toBe(3);
    expect(metadata && effectiveTimeout(metadata)).toBe(5000);
    expect(metadata && [...allowedErrorCodes(metadata)].sort()).toEqual([
      'NO_FUNDS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
    ]);
  });
});
