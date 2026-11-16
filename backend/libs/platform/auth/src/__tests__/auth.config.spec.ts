import { authConfigSchema } from '../auth.config.js';

describe('authConfigSchema', () => {
  it.each([
    ['a missing AUTH_ISSUER', {}],
    ['a blank AUTH_ISSUER', { AUTH_ISSUER: '  ' }],
  ])('rejects %s', (_name, input) => {
    expect(authConfigSchema.safeParse(input).success).toBe(false);
  });

  it('accepts an issuer without a JWKS url', () => {
    expect(
      authConfigSchema.safeParse({ AUTH_ISSUER: 'https://identity.test' })
        .success,
    ).toBe(true);
  });

  it('rejects a JWKS url that is not a url', () => {
    expect(
      authConfigSchema.safeParse({
        AUTH_ISSUER: 'https://identity.test',
        AUTH_JWKS_URL: 'not-a-url',
      }).success,
    ).toBe(false);
  });

  it('accepts a JWKS url', () => {
    expect(
      authConfigSchema.safeParse({
        AUTH_ISSUER: 'https://identity.test',
        AUTH_JWKS_URL: 'https://identity.test/.well-known/jwks.json',
      }).success,
    ).toBe(true);
  });
});
