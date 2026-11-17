import { randomUUID } from 'node:crypto';
import { PartitionedBloomFilter } from '@platform/bloom';
import { CacheAside, VersionedKeyspace } from '@platform/cache';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { HealthState, SystemRandomSource } from '@platform/kernel';
import { PolicyName, ResilienceRegistry } from '@platform/resilience';
import {
  ShardAccess,
  ShardKey,
  ShardRouter,
  TenantStatus,
  type TenantPlacement,
} from '@platform/sharding';
import {
  InMemoryDirectoryStore,
  runRoutingCacheContract,
} from '@platform/sharding/test-utils';
import {
  CountingLoader,
  RecordingCacheErrorReporter,
  runCachePortContract,
} from '@platform/cache/test-utils';
import { ValkeyAuthTokenProvider } from '../valkey-auth-token-provider.js';
import { ValkeyBloomFilter } from '../valkey-bloom-filter.js';
import { ValkeyCache } from '../valkey-cache.js';
import { ValkeyClientFactory } from '../valkey-client-factory.js';
import type { ValkeyConnectionOptions } from '../valkey-connection-options.js';
import { ValkeyConnectionResolver } from '../valkey-connection-resolver.js';
import type { ValkeyConnectionSettings } from '../valkey-connection-settings.js';
import { ValkeyHealthIndicator } from '../valkey-health-indicator.js';
import { ValkeyJobLock } from '../valkey-job-lock.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRoutingCache } from '../valkey-routing-cache.js';
import { ValkeyShardDirectoryChannel } from '../valkey-shard-directory-channel.js';
import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import { ValkeyAuthMode } from '../valkey-auth-mode.enum.js';
import { valkeyConfigSchema } from '../valkey.config.js';
import {
  PollUntil,
  ServerClock,
  ValkeyExecutors,
  ValkeyTestServer,
} from './utils/index.js';

/**
 * Pruebas contra un Valkey real con el módulo de bloom. Sin Docker se saltan;
 * con `INTEGRATION_TESTS=require` la falta de Docker es un error.
 */
jest.setTimeout(60_000);

const PREFIX = 'orders';
/**
 * La prueba de CacheAside cuenta cargas: una entrada que vence a mitad de la prueba vuelve a cargar. Con
 * todas las suites de integración en paralelo la prueba puede durar varios segundos, así que la entrada
 * vive mucho más que la prueba y su vencimiento no entra en juego.
 */
const CACHE_ASIDE_ENTRY_TTL_MS = 10 * 60_000;
const CACHE_ASIDE_CALL_BUDGET_MS = 10_000;
const keyspace = new ValkeyKeyspace(PREFIX);
const T1 = '01941f29-7c00-7000-8000-000000000001';
const READ = {
  tenantId: T1,
  keyKind: ShardKey.Tenant,
  access: ShardAccess.Read,
} as const;

function placement(overrides: Partial<TenantPlacement> = {}): TenantPlacement {
  return {
    tenantId: T1,
    region: 'eu',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
    ...overrides,
  };
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('Valkey adapters against a real server', () => {
  const server = new ValkeyTestServer(PREFIX);

  const executor = () => ValkeyExecutors.over(server.connect());
  const cache = () => new ValkeyCache(executor(), keyspace);
  const routingCache = () => new ValkeyRoutingCache(executor(), keyspace);

  beforeAll(() => server.start(), 300_000);
  afterAll(() => server.stop());
  beforeEach(() => server.flush());

  it('refuses keys outside the keyspace, as the ACL in AWS does', async () => {
    await expect(server.connect().call('SET', 'bloom:x', '1')).rejects.toThrow(
      /NOPERM/,
    );
  });

  describe('connections created by the factory', () => {
    /** Entrega la contraseña vigente de cada conexión, como un token IAM que se renueva. */
    class RotatingPassword extends ValkeyAuthTokenProvider {
      current = server.password;

      async token(): Promise<string> {
        return this.current;
      }
    }

    /** El servidor de prueba no habla TLS, que el resolutor exige con IAM. */
    class PlainTextResolver extends ValkeyConnectionResolver {
      override resolve(
        ...args: Parameters<ValkeyConnectionResolver['resolve']>
      ): ValkeyConnectionSettings {
        const resolved = super.resolve(...args);
        return {
          ...resolved,
          connection: {
            ...resolved.connection,
            tls: false,
          } as ValkeyConnectionOptions,
        };
      }
    }

    it('authenticates each reconnection with the token of that moment', async () => {
      const provider = new RotatingPassword();
      const client = await new ValkeyClientFactory(
        new PlainTextResolver(),
        valkeyConfigSchema.parse({
          VALKEY_HOST: server.host,
          VALKEY_PORT: String(server.port),
          VALKEY_USER: PREFIX,
          VALKEY_TLS: 'true',
          VALKEY_AUTH: ValkeyAuthMode.Iam,
          VALKEY_CACHE_NAME: 'cache-1',
        }),
        { commandTimeoutMs: 5_000 },
        provider,
      ).create();
      // Mientras la contraseña rota, las reconexiones con la vieja fallan: es lo que se prueba.
      client.on('error', () => undefined);
      try {
        await expect(client.call('SET', `${PREFIX}:auth`, '1')).resolves.toBe(
          'OK',
        );

        // Se rota la contraseña: solo vale la nueva, y se corta la conexión.
        const rotated = randomUUID();
        provider.current = rotated;
        await server.rotatePassword(rotated);

        await PollUntil.run(async () => {
          try {
            return (await client.call('GET', `${PREFIX}:auth`)) === '1';
          } catch {
            return false;
          }
        });
      } finally {
        client.disconnect();
        await server.rotatePassword(server.password);
      }
    });
  });

  runCachePortContract('ValkeyCache', () => {
    const clock = new ServerClock(server.superuser, `${PREFIX}:*`);
    return {
      cache: clock.scaled(cache()),
      advance: (ms: number) => clock.advance(ms),
    };
  });

  describe('ValkeyCache', () => {
    it('stores, expires and sets only when absent', async () => {
      const store = cache();
      await store.set('a', 'one', 500);
      await expect(store.get('a')).resolves.toBe('one');
      await PollUntil.run(async () => (await store.get('a')) === undefined);

      await expect(store.setIfAbsent('b', 'first')).resolves.toBe(true);
      await expect(store.setIfAbsent('b', 'second')).resolves.toBe(false);
      await expect(store.get('b')).resolves.toBe('first');
      await store.delete('b');
      await expect(store.get('b')).resolves.toBeUndefined();
    });

    it('agrees on one version token among concurrent first readers', async () => {
      const keyspaces = Array.from(
        { length: 10 },
        () => new VersionedKeyspace(cache()),
      );
      const tokens = await Promise.all(
        keyspaces.map((versions) => versions.version(['t1', 'orders'])),
      );
      expect(new Set(tokens).size).toBe(1);
    });

    it('serves CacheAside reads and invalidations', async () => {
      const absorbed = new RecordingCacheErrorReporter();
      const store = cache();
      const aside = new CacheAside(store, new VersionedKeyspace(store), {
        // La política por defecto corta cada llamada a los 100 ms y la llamada completa a los 200 ms; con
        // todas las suites en paralelo una respuesta de Valkey tarda más, CacheAside la absorbe cargando
        // directo y la cuenta de cargas cambia. Esta prueba trata del viaje al servidor, no de los plazos:
        // los dos presupuestos se amplían juntos (ampliar solo el del intento deja el total en 200 ms).
        resilience: new ResilienceRegistry({
          [PolicyName.Cache.value]: {
            timeoutMs: CACHE_ASIDE_CALL_BUDGET_MS,
            totalTimeoutMs: CACHE_ASIDE_CALL_BUDGET_MS,
          },
        }),
        reporter: absorbed,
      });
      const loader = new CountingLoader({ total: 3 });
      const read = () =>
        aside.getOrLoad({
          namespace: ['t1', 'orders'],
          params: { page: 1 },
          ttlMs: CACHE_ASIDE_ENTRY_TTL_MS,
          load: loader.load,
        });

      await expect(read()).resolves.toEqual({ total: 3 });
      // La escritura no se espera: se sondea hasta que una lectura sale del caché.
      await PollUntil.run(async () => {
        const loads = loader.calls;
        await read();
        return loader.calls === loads;
      });
      const cachedLoads = loader.calls;
      await expect(read()).resolves.toEqual({ total: 3 });
      expect(loader.calls).toBe(cachedLoads);

      await aside.invalidate(['t1', 'orders']);
      await read();
      expect(loader.calls).toBe(cachedLoads + 1);
      // Si algo se absorbió, la cuenta de cargas ya no prueba el viaje al servidor: que lo diga.
      expect(absorbed.errors).toEqual([]);
    });
  });

  runRoutingCacheContract('ValkeyRoutingCache', async () => {
    const clock = new ServerClock(server.superuser, `${PREFIX}:*`);
    return {
      cache: clock.scaledRouting(routingCache()),
      advance: (ms: number) => clock.advance(ms),
    };
  });

  describe('ValkeyRoutingCache.setIfNewer', () => {
    it('keeps the highest version under concurrent writers on separate connections', async () => {
      const writers = Array.from({ length: 8 }, () => routingCache());
      const versions = Array.from({ length: 200 }, (_, i) => (i * 37) % 200);
      await Promise.all(
        versions.map((version, i) =>
          writers[i % writers.length]?.setIfNewer(
            'race',
            `value-${version}`,
            version,
            10_000,
          ),
        ),
      );
      await expect(writers[0]?.get('race')).resolves.toBe('value-199');
    });

    // La carrera de la prueba de ShardRouter (una lectura lenta que termina tras una invalidación), ahora
    // contra Valkey y dos conexiones.
    it('does not let a read in flight in another process resurrect an invalidated placement', async () => {
      const store = new InMemoryDirectoryStore();
      store.setInstance('shard-1', 'pg-1');
      store.setInstance('shard-2', 'pg-2');
      store.setPlacement(placement({ shardGroup: ['shard-1'], version: 1 }));
      let release: (value: TenantPlacement | undefined) => void = () =>
        undefined;
      const stale = new Promise<TenantPlacement | undefined>((resolve) => {
        release = resolve;
      });
      let reads = 0;
      const slowDirectory = {
        getPlacement: (tenantId: string) => {
          reads += 1;
          return reads === 1 ? stale : store.getPlacement(tenantId);
        },
        getInstance: (shard: string) => store.getInstance(shard),
      };
      const reader = new ShardRouter({
        directory: slowDirectory,
        sharedCache: routingCache(),
      });
      const mover = new ShardRouter({
        directory: store,
        sharedCache: routingCache(),
      });

      const inFlight = reader.resolve(READ);
      await PollUntil.run(() => reads > 0);
      store.setPlacement(placement({ shardGroup: ['shard-2'], version: 2 }));
      await mover.invalidate(T1);
      release(placement({ shardGroup: ['shard-1'], version: 1 }));
      await expect(inFlight).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      const fresh = new ShardRouter({
        directory: store,
        sharedCache: routingCache(),
      });
      await expect(fresh.resolve(READ)).resolves.toMatchObject({
        logicalShard: 'shard-2',
      });
    });
  });

  describe('ShardDirectoryChanged over pub/sub', () => {
    it('drops the placement in another process right after a move', async () => {
      const store = new InMemoryDirectoryStore();
      store.setInstance('shard-1', 'pg-1');
      store.setInstance('shard-2', 'pg-2');
      store.setPlacement(placement({ shardGroup: ['shard-1'], version: 1 }));
      const channel = () => {
        const opener = {
          create: async () => {
            const client = server.connect();
            await client.connect();
            return client;
          },
        };
        return new ValkeyShardDirectoryChannel(
          executor(),
          new ValkeySubscriberSource(opener),
          keyspace,
        );
      };

      const mover = new ShardRouter({
        directory: store,
        sharedCache: routingCache(),
        changes: channel(),
      });
      const other = new ShardRouter({
        directory: store,
        sharedCache: routingCache(),
      });
      const stop = await other.listen(channel());
      await expect(other.resolve(READ)).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      store.setPlacement(placement({ shardGroup: ['shard-2'], version: 2 }));
      await mover.invalidate(T1, { version: 2 });

      await PollUntil.run(
        async () => (await other.resolve(READ)).logicalShard === 'shard-2',
      );
      await stop();
    });
  });

  describe('ValkeyJobLock', () => {
    const lock = () =>
      new ValkeyJobLock(executor(), keyspace, new SystemRandomSource());

    it('keeps two instances from taking the same job', async () => {
      const [first, second] = [lock(), lock()];
      const winner = await first.tryAcquire('outbox-relay', 10_000);
      expect(winner).toBeDefined();
      await expect(
        second.tryAcquire('outbox-relay', 10_000),
      ).resolves.toBeUndefined();
      // Otro job no se ve afectado.
      await expect(
        second.tryAcquire('retention', 10_000),
      ).resolves.toBeDefined();
    });

    it('lets exactly one of many concurrent instances take the job', async () => {
      const results = await Promise.all(
        Array.from({ length: 12 }, () => lock().tryAcquire('race', 10_000)),
      );
      expect(results.filter((lease) => lease !== undefined)).toHaveLength(1);
    });

    it('frees the job when its owner releases it', async () => {
      const [first, second] = [lock(), lock()];
      const lease = await first.tryAcquire('job', 10_000);
      await first.release(lease ?? { name: 'job', token: '' });
      await expect(second.tryAcquire('job', 10_000)).resolves.toBeDefined();
    });

    it('never frees a lock another instance took after the lease expired', async () => {
      const [first, second] = [lock(), lock()];
      const stale = await first.tryAcquire('job', 50);
      await PollUntil.run(
        async () => (await second.tryAcquire('job', 10_000)) !== undefined,
      );

      await first.release(stale ?? { name: 'job', token: '' });

      await expect(lock().tryAcquire('job', 10_000)).resolves.toBeUndefined();
    });

    it('expires by itself so a crashed owner does not block the job forever', async () => {
      const first = lock();
      await first.tryAcquire('job', 100);
      await PollUntil.run(
        async () => (await lock().tryAcquire('job', 10_000)) !== undefined,
      );
    });
  });

  describe('ValkeyHealthIndicator', () => {
    it('is up against a live server', async () => {
      await expect(
        new ValkeyHealthIndicator(executor()).check(),
      ).resolves.toEqual({ state: HealthState.Up });
    });
  });

  describe('ValkeyBloomFilter', () => {
    const create = (name: string, expectedItems: number) =>
      new ValkeyBloomFilter(executor(), {
        name,
        expectedItems,
        keyspace,
        ids: new SequentialIdGenerator(),
      });

    it('has no false negatives and about 1 % false positives', async () => {
      const filter = create('emails', 5_000);
      const members = Array.from({ length: 5_000 }, (_, i) => `member-${i}`);
      await filter.addMany(members);
      await filter.add('one-more');
      // Las consultas salen juntas: el cliente las encadena en una conexión en vez de pagar un viaje cada una.
      const present = await Promise.all(
        [...members.slice(0, 200), 'one-more'].map((item) =>
          filter.mightContain(item),
        ),
      );
      expect(present.every(Boolean)).toBe(true);
      const absent = await Promise.all(
        Array.from({ length: 2_000 }, (_, i) =>
          filter.mightContain(`absent-${i}`),
        ),
      );
      expect(absent.filter(Boolean).length / 2_000).toBeLessThan(0.03);
    });

    it('rebuilds from the source and swaps atomically', async () => {
      const filter = create('tokens', 1_000);
      await filter.add('revoked-long-ago');
      async function* source(): AsyncIterable<readonly string[]> {
        yield ['fresh-1', 'fresh-2'];
      }
      await filter.rebuild(source());
      await expect(filter.mightContain('fresh-1')).resolves.toBe(true);
      await expect(filter.mightContain('revoked-long-ago')).resolves.toBe(
        false,
      );
      await expect(server.keys('*rebuild*')).resolves.toEqual([]);
    });

    it('works as partitions of a bigger filter', async () => {
      const filter = new PartitionedBloomFilter([
        create('hibp-0', 1_000),
        create('hibp-1', 1_000),
      ]);
      const hashes = Array.from({ length: 1_500 }, (_, i) => `sha1-${i}`);
      await filter.addMany(hashes);
      const found = await Promise.all(
        hashes.slice(0, 100).map((hash) => filter.mightContain(hash)),
      );
      expect(found.every(Boolean)).toBe(true);
    });
  });
});
