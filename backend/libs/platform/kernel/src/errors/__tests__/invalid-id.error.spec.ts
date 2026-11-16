import { DomainError } from '../domain-error.js';
import { InvalidIdError } from '../invalid-id.error.js';
import { KernelErrorCode } from '../kernel-error-code.enum.js';

describe('InvalidIdError', () => {
  it('is a domain error that does not leak the received value', () => {
    const error = new InvalidIdError('secret-value');
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(KernelErrorCode.InvalidId);
    expect(JSON.stringify(error.details)).not.toContain('secret-value');
    expect(error.message).not.toContain('secret-value');
    expect(error.details).toEqual({ receivedType: 'string' });
  });
});
