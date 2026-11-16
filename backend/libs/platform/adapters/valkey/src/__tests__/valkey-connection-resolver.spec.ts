import { ConfigValidationError } from '@platform/config';
import { ValkeyAuthMode } from '../valkey-auth-mode.enum.js';
import { ValkeyConnectionResolver } from '../valkey-connection-resolver.js';
import { valkeyConfigSchema } from '../valkey.config.js';
import { StaticTokenProvider } from './utils/index.js';

const resolver = new ValkeyConnectionResolver();
const parse = (env: Record<string, string>) => valkeyConfigSchema.parse(env);

describe('valkeyConfigSchema', () => {
  it('needs no key prefix, because the service name is the default', () => {
    expect(
      parse({ VALKEY_URL: 'redis://localhost:6379' }).VALKEY_KEY_PREFIX,
    ).toBeUndefined();
  });

  it.each([['a:b'], ['with space'], ['x'.repeat(65)]])(
    'rejects the key prefix %p',
    (prefix) => {
      expect(() =>
        parse({
          VALKEY_URL: 'redis://localhost:6379',
          VALKEY_KEY_PREFIX: prefix,
        }),
      ).toThrow();
    },
  );

  it('rejects a URL that is not redis:// or rediss://', () => {
    expect(() => parse({ VALKEY_URL: 'http://localhost' })).toThrow();
  });
});

describe('ValkeyConnectionResolver', () => {
  it('connects by URL locally, without authentication', () => {
    const settings = resolver.resolve(
      parse({ VALKEY_URL: 'redis://localhost:6379' }),
      { connectionName: 'orders' },
    );
    expect(settings.connection).toEqual(
      expect.objectContaining({
        url: 'redis://localhost:6379',
        connectionName: 'orders',
      }),
    );
    expect(settings.auth).toBeUndefined();
  });

  it('reads the variables the service stack of Terraform injects', () => {
    const provider = new StaticTokenProvider();
    const settings = resolver.resolve(
      parse({
        VALKEY_HOST: 'cache.serverless.use1.cache.amazonaws.com',
        VALKEY_PORT: '6379',
        VALKEY_TLS: 'true',
        VALKEY_USER: 'node-template-dev-identity',
        VALKEY_AUTH: ValkeyAuthMode.IamServerless,
        VALKEY_CACHE_NAME: 'node-template-dev-valkey',
      }),
      {},
      provider,
    );
    expect(settings.connection).toEqual(
      expect.objectContaining({
        host: 'cache.serverless.use1.cache.amazonaws.com',
        port: 6379,
        tls: true,
        username: 'node-template-dev-identity',
      }),
    );
    expect(settings.auth).toEqual({
      provider,
      request: {
        userId: 'node-template-dev-identity',
        cacheName: 'node-template-dev-valkey',
        serverless: true,
      },
    });
  });

  it('marks a replication group, not serverless', () => {
    const settings = resolver.resolve(
      parse({
        VALKEY_HOST: 'cache',
        VALKEY_TLS: 'true',
        VALKEY_USER: 'svc',
        VALKEY_AUTH: ValkeyAuthMode.Iam,
        VALKEY_CACHE_NAME: 'group',
      }),
      {},
      new StaticTokenProvider(),
    );
    expect(settings.auth?.request.serverless).toBe(false);
  });

  it('lists every inconsistent variable', () => {
    let error: unknown;
    try {
      resolver.resolve(
        parse({
          VALKEY_URL: 'redis://localhost:6379',
          VALKEY_HOST: 'cache',
          VALKEY_AUTH: ValkeyAuthMode.Iam,
        }),
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect(
      (error as ConfigValidationError).issues.map((issue) => issue.path),
    ).toEqual([
      'VALKEY_URL',
      'VALKEY_USER',
      'VALKEY_CACHE_NAME',
      'VALKEY_TLS',
      'VALKEY_AUTH',
    ]);
  });

  it('requires VALKEY_HOST with IAM, because a URL has no cache endpoint', () => {
    let error: unknown;
    try {
      resolver.resolve(
        parse({
          VALKEY_URL: 'rediss://cache:6379',
          VALKEY_TLS: 'true',
          VALKEY_USER: 'svc',
          VALKEY_AUTH: ValkeyAuthMode.Iam,
          VALKEY_CACHE_NAME: 'group',
        }),
        {},
        new StaticTokenProvider(),
      );
    } catch (caught) {
      error = caught;
    }
    expect(
      (error as ConfigValidationError).issues.map((issue) => issue.path),
    ).toEqual(['VALKEY_HOST']);
  });

  it('fails when neither a URL nor a host is set', () => {
    expect(() => resolver.resolve(parse({}))).toThrow(ConfigValidationError);
  });
});
