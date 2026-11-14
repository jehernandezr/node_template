import { CacheInvalidArgumentError } from './errors.js';
import { jitteredTtl } from './jittered-ttl.js';

describe('jitteredTtl', () => {
  it('returns the lower bound when random is 0 and the upper bound when random approaches 1', () => {
    expect(jitteredTtl(1000, { random: () => 0 })).toBe(900);
    expect(jitteredTtl(1000, { random: () => 0.999999 })).toBe(1100);
  });

  it('stays within bounds and returns integers for random samples', () => {
    for (let i = 0; i < 1000; i++) {
      const ttl = jitteredTtl(5000);
      expect(Number.isInteger(ttl)).toBe(true);
      expect(ttl).toBeGreaterThanOrEqual(4500);
      expect(ttl).toBeLessThanOrEqual(5500);
    }
  });

  it('honors a custom ratio', () => {
    expect(jitteredTtl(1000, { ratio: 0.5, random: () => 0 })).toBe(500);
    expect(jitteredTtl(1000, { ratio: 0.5, random: () => 0.999999 })).toBe(
      1500,
    );
  });

  it('rejects invalid arguments', () => {
    expect(() => jitteredTtl(-1)).toThrow(CacheInvalidArgumentError);
    expect(() => jitteredTtl(1000, { ratio: 1.5 })).toThrow(
      CacheInvalidArgumentError,
    );
  });
});
