import { SmokeAccount } from '../smoke-account.js';

describe('SmokeAccount', () => {
  const valid = {
    email: 'success@simulator.amazonses.com',
    password: 'a long smoke passphrase',
    totpSecret: 'MZXW6YTBOJTG633CMFZA',
  };

  it('reads the email, the password and the Base32 TOTP secret', () => {
    const account = SmokeAccount.parse(JSON.stringify(valid));

    expect(account.email).toBe(valid.email);
    expect(account.password).toBe(valid.password);
    expect(Buffer.from(account.totpSecret).toString()).toBe('foobarfoobar');
  });

  it('names the invalid fields without echoing their values', () => {
    const parse = () =>
      SmokeAccount.parse(
        JSON.stringify({ ...valid, password: 'short', totpSecret: 'not-b32' }),
      );

    expect(parse).toThrow(/password, totpSecret$/);
    expect(parse).not.toThrow(/short|not-b32/);
  });

  it('rejects text that is not JSON', () => {
    expect(() => SmokeAccount.parse('email=a')).toThrow(
      'The smoke account is not JSON',
    );
  });
});
