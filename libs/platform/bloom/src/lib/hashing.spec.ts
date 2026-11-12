import { fnv1a32, murmur3_32 } from './hashing.js';

describe('fnv1a32', () => {
  it('matches the reference vectors', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });

  it('hashes UTF-8 bytes deterministically', () => {
    expect(fnv1a32('ñandú')).toBe(fnv1a32('ñandú'));
    expect(fnv1a32('ñ')).not.toBe(fnv1a32('n'));
  });
});

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
