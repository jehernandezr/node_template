import { Hashes } from '../hashes.js';

describe('Hashes', () => {
  // Reference vectors for 32-bit FNV-1a.
  it.each([
    ['', 0x811c9dc5, '811c9dc5'],
    ['a', 0xe40c292c, 'e40c292c'],
    ['foobar', 0xbf9cf968, 'bf9cf968'],
  ])('hashes %p', (input, expected, hex) => {
    expect(Hashes.fnv1a32(input)).toBe(expected);
    expect(Hashes.fnv1a32Hex(input)).toBe(hex);
  });

  it('hashes the UTF-8 bytes of the string', () => {
    const text = 'ñandú 🦤';
    expect(Hashes.fnv1a32(text)).toBe(
      Hashes.fnv1a32(new TextEncoder().encode(text)),
    );
    expect(Hashes.fnv1a32('ñ')).not.toBe(Hashes.fnv1a32('n'));
  });

  it.each(['x', 'hello world', 'tenant:42', '\u0000'])(
    'returns an unsigned 32-bit integer for %p',
    (input) => {
      const hash = Hashes.fnv1a32(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    },
  );

  it('pads the hex form to 8 characters', () => {
    expect(Hashes.fnv1a32Hex(new Uint8Array([0x00]))).toMatch(/^[0-9a-f]{8}$/);
  });
});
