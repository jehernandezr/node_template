import { CookieParser } from '../../cookies/cookie-parser.js';

describe('CookieParser', () => {
  it('reads name and value pairs separated by semicolons', () => {
    const cookies = CookieParser.parse('a=1; b=two');

    expect([...cookies]).toEqual([
      ['a', '1'],
      ['b', 'two'],
    ]);
  });

  it('returns an empty map without a header', () => {
    expect(CookieParser.parse(undefined).size).toBe(0);
  });

  it('ignores pairs without an equal sign or with an empty name', () => {
    const cookies = CookieParser.parse('flag; =orphan; ok=yes');

    expect([...cookies]).toEqual([['ok', 'yes']]);
  });

  it('keeps the first occurrence of a name', () => {
    expect(CookieParser.parse('a=first; a=second').get('a')).toBe('first');
  });

  it('decodes the value and keeps it raw when decoding fails', () => {
    const cookies = CookieParser.parse('a=hello%20world; b=%E0%A4%A');

    expect(cookies.get('a')).toBe('hello world');
    expect(cookies.get('b')).toBe('%E0%A4%A');
  });
});
