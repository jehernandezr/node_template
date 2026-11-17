import { encodeBase32 } from '../base32.js';

describe('encodeBase32', () => {
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes %j like RFC 4648 without padding', (text, expected) => {
    expect(encodeBase32(Buffer.from(text))).toBe(expected);
  });
});
