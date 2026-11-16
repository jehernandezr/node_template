import { identityConfigSchema } from '../config/identity.config.js';
import { IdentityTestEnvironment } from './utils/index.js';

describe('IdentityTestEnvironment', () => {
  it('builds a valid identity configuration', () => {
    expect(() =>
      identityConfigSchema.parse(IdentityTestEnvironment.build()),
    ).not.toThrow();
  });

  it('keeps identity as the service name even when the base sets another', () => {
    const env = IdentityTestEnvironment.build({ SERVICE_NAME: 'otro' });

    expect(env['SERVICE_NAME']).toBe('identity');
    expect(identityConfigSchema.parse(env).SERVICE_NAME).toBe('identity');
  });

  it('gives each build its own secrets', () => {
    const first = IdentityTestEnvironment.build();
    const second = IdentityTestEnvironment.build();

    expect(first['IDENTITY_EMAIL_PEPPER']).not.toBe(
      second['IDENTITY_EMAIL_PEPPER'],
    );
    expect(first['IDENTITY_SIGNING_KEYS']).not.toBe(
      second['IDENTITY_SIGNING_KEYS'],
    );
  });
});
