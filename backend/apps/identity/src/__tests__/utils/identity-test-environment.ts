import { randomBytes, generateKeyPairSync } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';

const ISSUER = 'https://identity.test';

/** Valid environment variables for `identityConfigSchema`, with new secrets on each call. */
export class IdentityTestEnvironment {
  /** URLs of the services the sagas call; the tests that exercise them replace them with stubs. */
  static readonly PEERS = {
    billing: 'http://billing.test',
    notifications: 'http://notifications.test',
    tasks: 'http://tasks.test',
    reports: 'http://reports.test',
  } as const;

  /**
   * `base` wins over the defaults and `SERVICE_NAME` always stays `identity`, even if
   * another service's environment (for example Valkey's) brings a different name.
   */
  static build(base: ConfigEnv = {}): ConfigEnv {
    const ids = new SequentialIdGenerator();
    return {
      ...IdentityTestEnvironment.defaults(ids),
      ...base,
      SERVICE_NAME: 'identity',
    };
  }

  private static defaults(ids: SequentialIdGenerator): ConfigEnv {
    return {
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      IDENTITY_REGION: 'eu',
      IDENTITY_ISSUER: ISSUER,
      AUTH_ISSUER: ISSUER,
      AUTH_JWKS_URL: `${ISSUER}/v1/auth/jwks`,
      WEB_ORIGINS: 'https://app.identity.test',
      IDENTITY_SIGNING_KEYS: IdentityTestEnvironment.signingKeys(),
      IDENTITY_EMAIL_PEPPER: IdentityTestEnvironment.secret(),
      IDENTITY_TOKEN_PEPPER: IdentityTestEnvironment.secret(),
      IDENTITY_API_KEY_PEPPER: IdentityTestEnvironment.secret(),
      IDENTITY_DEVICE_ID_KEY: IdentityTestEnvironment.secret(),
      IDENTITY_DATA_KEY: IdentityTestEnvironment.secret(),
      INTERNAL_API_SHARED_SECRET: IdentityTestEnvironment.secret(),
      INTERNAL_API_BASE_URLS: JSON.stringify(IdentityTestEnvironment.PEERS),
      IDENTITY_DEFAULT_TENANT_ID: ids.next().toString(),
      IDENTITY_PLATFORM_TENANT_ID: ids.next().toString(),
      WEBAUTHN_RP_ID: 'identity.test',
      WEBAUTHN_RP_NAME: 'Identity test',
      WEBAUTHN_ORIGINS: 'https://app.identity.test',
    };
  }

  private static secret(): string {
    return randomBytes(32).toString('base64url');
  }

  /** A new ES256 key as a private JWK, with a random `kid`, as `IDENTITY_SIGNING_KEYS` expects. */
  private static signingKeys(): string {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    return JSON.stringify([
      {
        ...privateKey.export({ format: 'jwk' }),
        kid: randomBytes(8).toString('base64url'),
        alg: 'ES256',
        use: 'sig',
      },
    ]);
  }
}
