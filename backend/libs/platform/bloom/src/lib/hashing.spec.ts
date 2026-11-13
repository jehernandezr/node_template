import { murmur3_32 } from './hashing.js';

describe('murmur3_32', () => {
  it('matches the reference vectors', () => {
    expect(murmur3_32('')).toBe(0);
    expect(murmur3_32('ab')).toBe(0x9bbfd75f);
    expect(murmur3_32('hello')).toBe(0x248bfa47);
    expect(
      murmur3_32('The quick brown fox jumps over the lazy dog', 0x9747b28c),
    ).toBe(0x2fa826cd);
  });

  it('changes with the seed', () => {
    expect(murmur3_32('item', 1)).not.toBe(murmur3_32('item', 2));
  });
});
