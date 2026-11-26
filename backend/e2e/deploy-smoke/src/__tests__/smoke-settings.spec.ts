import { SmokeSettings } from '../smoke-settings.js';

describe('SmokeSettings', () => {
  const account = {
    email: 'success@simulator.amazonses.com',
    password: ['local', 'smoke', 'phrase'].join('-'),
    totpSecret: 'GEZDGNBVGY3TQOJQ',
  };
  const env = (overrides: Record<string, string | undefined>) => ({
    SMOKE_BASE_URL: 'https://api.dev.example.com',
    SMOKE_ACCOUNT: JSON.stringify(account),
    ...overrides,
  });

  it('reads the base URL and the smoke account', () => {
    const settings = SmokeSettings.from(env({}));

    expect(settings.baseUrl.href).toBe('https://api.dev.example.com/');
    expect(settings.account).toEqual(account);
  });

  it.each([undefined, 'ftp://api.example.com', 'not a url'])(
    'rejects the base URL %p',
    (baseUrl) => {
      expect(() =>
        SmokeSettings.from(env({ SMOKE_BASE_URL: baseUrl })),
      ).toThrow('SMOKE_BASE_URL must be the http(s) URL of the API');
    },
  );

  it('rejects an account that is not JSON', () => {
    expect(() => SmokeSettings.from(env({ SMOKE_ACCOUNT: undefined }))).toThrow(
      'SMOKE_ACCOUNT must be JSON',
    );
  });

  it('names the invalid account fields without their values', () => {
    const read = () =>
      SmokeSettings.from(
        env({
          SMOKE_ACCOUNT: JSON.stringify({ ...account, totpSecret: 'n0t-b32' }),
        }),
      );

    expect(read).toThrow('SMOKE_ACCOUNT has invalid fields: totpSecret');
    expect(read).not.toThrow(/n0t-b32/);
  });
});
