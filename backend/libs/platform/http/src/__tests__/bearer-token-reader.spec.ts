import { BearerTokenReader } from '../bearer-token-reader.js';

describe('BearerTokenReader', () => {
  it('reads the token of a bearer header in any case', () => {
    expect(BearerTokenReader.read('bearer abc.def')).toBe('abc.def');
    expect(BearerTokenReader.read('Bearer abc')).toBe('abc');
  });

  it.each([
    ['no header', undefined],
    ['a repeated header', ['Bearer a', 'Bearer b']],
    ['another scheme', 'Basic abc'],
    ['no token', 'Bearer '],
    ['extra words', 'Bearer a b'],
  ])('returns undefined for %s', (_label, header) => {
    expect(BearerTokenReader.read(header)).toBeUndefined();
  });

  it('recognizes session tokens and API keys by prefix', () => {
    expect(BearerTokenReader.isSessionToken('st1_abc')).toBe(true);
    expect(BearerTokenReader.isSessionToken('eyJhbGci')).toBe(false);
    expect(BearerTokenReader.isApiKey('sk_test_abc')).toBe(true);
    expect(BearerTokenReader.isApiKey('st1_abc')).toBe(false);
  });
});
