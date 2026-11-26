import { decodeBase32, encodeBase32 } from '../base32.js';

const RFC_4648_VECTORS: Array<[string, string]> = [
  ['', ''],
  ['f', 'MY'],
  ['fo', 'MZXQ'],
  ['foo', 'MZXW6'],
  ['foob', 'MZXW6YQ'],
  ['fooba', 'MZXW6YTB'],
  ['foobar', 'MZXW6YTBOI'],
];

describe('encodeBase32', () => {
  it.each(RFC_4648_VECTORS)(
    'encodes %j like RFC 4648 without padding',
    (text, expected) => {
      expect(encodeBase32(Buffer.from(text))).toBe(expected);
    },
  );
});

describe('decodeBase32', () => {
  it.each(RFC_4648_VECTORS)(
    'decodes the RFC 4648 encoding of %j',
    (text, encoded) => {
      expect(Buffer.from(decodeBase32(encoded)).toString()).toBe(text);
    },
  );

  it('reads lowercase and padded text as authenticator apps accept it', () => {
    expect(Buffer.from(decodeBase32('mzxw6ytboi======')).toString()).toBe(
      'foobar',
    );
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => decodeBase32('MZXW1')).toThrow(RangeError);
  });
});
