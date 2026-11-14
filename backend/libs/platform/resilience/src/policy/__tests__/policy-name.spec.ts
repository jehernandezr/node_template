import { ResilienceErrorCode } from '../../errors/resilience-error-code.enum.js';
import { PolicyName } from '../policy-name.js';

describe('PolicyName', () => {
  it.each(['cache', 'payments', 'external.api-v2', 'a_b', '0x1'])(
    'accepts %p',
    (value) => {
      expect(PolicyName.of(value).value).toBe(value);
    },
  );

  it.each(['', 'Upper', 'with space', 'has:colon', '.leading', 'a'.repeat(65)])(
    'rejects %p with InvalidPolicy',
    (value) => {
      expect(() => PolicyName.of(value)).toThrow(
        expect.objectContaining({ code: ResilienceErrorCode.InvalidPolicy }),
      );
    },
  );

  it('exposes the built-in names and prints them as their value', () => {
    expect(PolicyName.Cache.value).toBe('cache');
    expect(PolicyName.Database.toString()).toBe('database');
  });

  it('treats two names with the same value as the same policy', () => {
    expect(PolicyName.of('cache').value).toBe(PolicyName.Cache.value);
  });
});
