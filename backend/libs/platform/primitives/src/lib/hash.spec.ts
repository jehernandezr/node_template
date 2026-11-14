import { fnv1a32, fnv1a32Hex } from './hash.js';

describe('fnv1a32', () => {
  // Vectores de referencia de FNV-1a de 32 bits.
  it.each([
    ['', 0x811c9dc5, '811c9dc5'],
    ['a', 0xe40c292c, 'e40c292c'],
    ['foobar', 0xbf9cf968, 'bf9cf968'],
  ])('hashes %p', (input, expected, hex) => {
    expect(fnv1a32(input)).toBe(expected);
    expect(fnv1a32Hex(input)).toBe(hex);
  });

  it('hashes the UTF-8 bytes of the string', () => {
    const text = 'ñandú 🦤';
    expect(fnv1a32(text)).toBe(fnv1a32(new TextEncoder().encode(text)));
    expect(fnv1a32('ñ')).not.toBe(fnv1a32('n'));
  });

  it('returns an unsigned 32-bit integer', () => {
    for (const input of ['x', 'hello world', 'tenant:42', '\u0000']) {
      const hash = fnv1a32(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    }
  });

  it('pads the hex form to 8 characters', () => {
    const hex = fnv1a32Hex(new Uint8Array([0x00]));
    expect(hex).toMatch(/^[0-9a-f]{8}$/);
    for (let i = 0; i < 500; i += 1) {
      expect(fnv1a32Hex(`key-${i}`)).toHaveLength(8);
    }
  });

  it('is deterministic', () => {
    expect(fnv1a32('same')).toBe(fnv1a32('same'));
  });
});
