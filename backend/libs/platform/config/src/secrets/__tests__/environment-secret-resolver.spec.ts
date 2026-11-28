import { ConfigValidationError } from '../../errors/config-validation.error.js';
import { InMemorySecretSource } from '../../__tests__/utils/in-memory-secret-source.js';
import { EnvironmentSecretResolver } from '../environment-secret-resolver.js';

const PEPPER_ARN =
  'arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/identity/email-pepper-AbCdEf';
const ROOT_ARN =
  'arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev-observability-root-GhIjKl';

describe('EnvironmentSecretResolver', () => {
  const source = (): InMemorySecretSource =>
    new InMemorySecretSource({
      [PEPPER_ARN]: 'pepper-value-of-the-test',
      [ROOT_ARN]: JSON.stringify({ OTLP_AUTHORIZATION: 'Basic dGVzdA==' }),
    });

  it('adds the value of every variable of SECRETS_MAP to the environment', async () => {
    const env = await new EnvironmentSecretResolver(source()).resolve({
      SERVICE_NAME: 'identity',
      SECRETS_MAP: JSON.stringify({
        IDENTITY_EMAIL_PEPPER: PEPPER_ARN,
        OTLP_AUTHORIZATION: `${ROOT_ARN}:OTLP_AUTHORIZATION::`,
      }),
    });

    expect(env).toMatchObject({
      SERVICE_NAME: 'identity',
      IDENTITY_EMAIL_PEPPER: 'pepper-value-of-the-test',
      OTLP_AUTHORIZATION: 'Basic dGVzdA==',
    });
  });

  it('reads all the secrets in one batch', async () => {
    const secrets = source();

    await new EnvironmentSecretResolver(secrets).resolve({
      SECRETS_MAP: JSON.stringify({
        IDENTITY_EMAIL_PEPPER: PEPPER_ARN,
        OTLP_AUTHORIZATION: `${ROOT_ARN}:OTLP_AUTHORIZATION`,
      }),
    });

    expect(secrets.reads).toHaveLength(1);
  });

  it('keeps the environment and reads nothing without SECRETS_MAP', async () => {
    const secrets = source();
    const env = { SERVICE_NAME: 'identity', SECRETS_MAP: '' };

    await expect(
      new EnvironmentSecretResolver(secrets).resolve(env),
    ).resolves.toBe(env);
    expect(secrets.reads).toEqual([]);
  });

  it('rejects a variable that the environment already sets', async () => {
    const resolving = new EnvironmentSecretResolver(source()).resolve({
      IDENTITY_EMAIL_PEPPER: 'value-from-the-environment',
      SECRETS_MAP: JSON.stringify({ IDENTITY_EMAIL_PEPPER: PEPPER_ARN }),
    });

    await expect(resolving).rejects.toBeInstanceOf(ConfigValidationError);
    await expect(resolving).rejects.toMatchObject({
      issues: [
        expect.objectContaining({ path: 'SECRETS_MAP.IDENTITY_EMAIL_PEPPER' }),
      ],
    });
  });

  it('fails when a secret cannot be read', async () => {
    await expect(
      new EnvironmentSecretResolver(new InMemorySecretSource({})).resolve({
        SECRETS_MAP: JSON.stringify({ IDENTITY_EMAIL_PEPPER: PEPPER_ARN }),
      }),
    ).rejects.toThrow('no secret for IDENTITY_EMAIL_PEPPER');
  });
});
