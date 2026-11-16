import { ConfigValidationError } from '@platform/config';
import { CacheAside, VersionedKeyspace } from '@platform/cache';
import { FailureKind } from '@platform/kernel';
import { ResilienceEventKind, ResilienceRegistry } from '@platform/resilience';
import { ValkeyAuthMode } from '../valkey-auth-mode.enum.js';
import type { ValkeyAuthRequest } from '../valkey-auth-request.js';
import { ValkeyAuthTokenProvider } from '../valkey-auth-token-provider.js';
import { ValkeyCache } from '../valkey-cache.js';
import { ValkeyClientFactory } from '../valkey-client-factory.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyConnectionResolver } from '../valkey-connection-resolver.js';
import { ValkeyErrorCode } from '../valkey-error-code.enum.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { valkeyConfigSchema } from '../valkey.config.js';

/** Entrega un token distinto en cada pedido y guarda a quién se lo dio. */
class CountingTokenProvider extends ValkeyAuthTokenProvider {
  readonly requests: ValkeyAuthRequest[] = [];

  async token(request: ValkeyAuthRequest): Promise<string> {
    this.requests.push(request);
    return `token-${this.requests.length}`;
  }
}

// Nada escucha en el puerto 1: cada conexión se rechaza de una vez.
const DOWN = {
  VALKEY_HOST: '127.0.0.1',
  VALKEY_PORT: '1',
  VALKEY_USER: 'svc',
};

function factoryFor(
  env: Record<string, string>,
  provider?: ValkeyAuthTokenProvider,
): ValkeyClientFactory {
  return new ValkeyClientFactory(
    new ValkeyConnectionResolver(),
    valkeyConfigSchema.parse(env),
    { connectTimeoutMs: 200, connectionName: 'orders' },
    provider,
  );
}

describe('ValkeyClientFactory', () => {
  it('rejects an inconsistent configuration listing every variable', async () => {
    await expect(factoryFor({}).create()).rejects.toBeInstanceOf(
      ConfigValidationError,
    );
  });

  it('creates a client that connects on the first command, as the configured user', async () => {
    const client = await factoryFor(DOWN).create();
    try {
      expect(client.status).toBe('wait');
      expect(client.options.username).toBe('svc');
      expect(client.options.connectionName).toBe('orders');
      expect(client.options.password).toBeFalsy();
    } finally {
      client.disconnect();
    }
  });

  it('creates a client from a URL', async () => {
    const client = await factoryFor({
      VALKEY_URL: 'redis://127.0.0.1:1',
    }).create();
    try {
      expect(client.options.port).toBe(1);
    } finally {
      client.disconnect();
    }
  });

  it('uses TLS when the configuration asks for it', async () => {
    const client = await factoryFor({ ...DOWN, VALKEY_TLS: 'true' }).create();
    try {
      expect(client.options.tls).toEqual({});
    } finally {
      client.disconnect();
    }
  });

  it('fails with a transient error and the cache breaker opens when Valkey is down', async () => {
    const client = await factoryFor(DOWN).create();
    try {
      const cache = new ValkeyCache(
        new ValkeyCommandExecutor(client, new ValkeyErrorTranslator()),
        new ValkeyKeyspace('svc'),
      );
      await expect(cache.get('a')).rejects.toMatchObject({
        code: ValkeyErrorCode.CommandFailed,
        failureKind: FailureKind.Transient,
      });

      const registry = new ResilienceRegistry();
      const events: ResilienceEventKind[] = [];
      registry.onEvent((event) => {
        events.push(event.kind);
      });
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        resilience: registry,
      });
      for (let i = 0; i < 6; i += 1) {
        await expect(
          aside.getOrLoad({
            namespace: ['t1'],
            params: {},
            ttlMs: 1_000,
            load: async () => 'db',
          }),
        ).resolves.toBe('db');
      }
      expect(events).toContain(ResilienceEventKind.Break);
    } finally {
      client.disconnect();
    }
  });

  describe('with a token provider', () => {
    const iam = {
      ...DOWN,
      VALKEY_TLS: 'true',
      VALKEY_AUTH: ValkeyAuthMode.IamServerless,
      VALKEY_CACHE_NAME: 'node-template-dev-valkey',
    };

    it('asks for a fresh token before each connection and sends it as the password', async () => {
      const provider = new CountingTokenProvider();
      const client = await factoryFor(iam, provider).create();
      client.on('error', () => undefined);
      try {
        expect(provider.requests[0]).toEqual({
          userId: 'svc',
          cacheName: 'node-template-dev-valkey',
          serverless: true,
        });
        expect(client.options.password).toBe('token-1');
        // Un comando en cola mientras falla el primer intento se rechaza, no se pierde.
        await expect(client.call('GET', ['svc:a'])).rejects.toThrow();

        // Cada reconexión, automática o explícita, pidió su propio token.
        client.disconnect();
        await expect(client.connect()).rejects.toThrow();
        expect(provider.requests.length).toBeGreaterThan(1);
        expect(client.options.password).toBe(
          `token-${provider.requests.length}`,
        );
      } finally {
        client.disconnect();
      }
    });

    it('serves a reconnection that passes a callback', async () => {
      const client = await factoryFor(
        iam,
        new CountingTokenProvider(),
      ).create();
      client.on('error', () => undefined);
      try {
        client.disconnect();
        const outcome = await new Promise<Error | null | undefined>(
          (resolve) => {
            // iovalkey reconecta con `connect(callback)`; la prueba lo hace a mano.
            void client
              .connect((error) => resolve(error))
              .catch(() => undefined);
          },
        );
        expect(outcome).toBeInstanceOf(Error);
      } finally {
        client.disconnect();
      }
    });

    it('does not create the client when the token cannot be obtained', async () => {
      const failing = new (class extends ValkeyAuthTokenProvider {
        async token(): Promise<string> {
          throw new Error('no credentials');
        }
      })();
      await expect(factoryFor(iam, failing).create()).rejects.toThrow(
        'no credentials',
      );
    });

    it('needs a provider for an IAM mode', async () => {
      await expect(factoryFor(iam).create()).rejects.toBeInstanceOf(
        ConfigValidationError,
      );
    });
  });
});
