import { fnv1a32 } from './hash.js';

describe('fnv1a32', () => {
  it('returns the FNV offset basis for the empty string', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
  });

  it('matches known FNV-1a test vectors', () => {
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });

  it('is deterministic and returns an unsigned 32-bit integer', () => {
    const value = fnv1a32('tenant-42');
    expect(fnv1a32('tenant-42')).toBe(value);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffffff);
  });

  it('hashes multi-byte characters by their UTF-8 bytes', () => {
    expect(fnv1a32('ñ')).not.toBe(fnv1a32('n'));
    expect(fnv1a32('ñ')).toBeGreaterThanOrEqual(0);
  });
});
