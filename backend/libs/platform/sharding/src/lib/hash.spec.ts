import { fnv1a32 as primitivesFnv1a32 } from '@platform/primitives';
import { fnv1a32 } from './hash.js';

describe('fnv1a32 (deprecated alias)', () => {
  it('is the implementation from @platform/primitives', () => {
    expect(fnv1a32).toBe(primitivesFnv1a32);
  });

  it('keeps the known FNV-1a test vectors', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });
});
