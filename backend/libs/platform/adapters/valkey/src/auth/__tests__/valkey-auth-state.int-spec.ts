import {
  AuthStateKey,
  CachedAuthStateReader,
  RevocationReason,
  RevokedSessionRegistry,
  type Epoch,
} from '@platform/auth';
import { AsyncBatches } from './utils/async-batches.js';
import { runAuthStateContract } from '@platform/auth/test-utils';
import { BloomFilter, InMemoryAsyncBloomFilter } from '@platform/bloom';
import { SystemClock } from '@platform/kernel';
import { ContainerRuntime, FixedClock } from '@platform/kernel/test-utils';
import { AuthValkeyUsers } from './utils/auth-valkey-users.js';
import { UserConnectionOpener } from './utils/user-connection-opener.js';
import {
  PollUntil,
  ValkeyExecutors,
  ValkeyTestServer,
} from '../../__tests__/utils/index.js';
import { ValkeyAuthRevocationFeed } from '../valkey-auth-revocation-feed.js';
import { ValkeyAuthStateReader } from '../valkey-auth-state-reader.js';
import { ValkeyAuthStateWriter } from '../valkey-auth-state-writer.js';
import { ValkeySubscriberSource } from '../../valkey-subscriber-source.js';

/**
 * Authentication state against a real Valkey, with the two users of the Terraform
 * ACL. Without Docker they are skipped; with `INTEGRATION_TESTS=require` missing
 * Docker is an error. The clock is the real system clock: the TTL and the index score
 * are evaluated against the server clock.
 */
jest.setTimeout(60_000);

const runtime = new ContainerRuntime(process.env);
const EPOCH: Epoch = { revokedBefore: 1_700_000_000, suspended: false };

runtime.describeIfAvailable('Valkey auth state against a real server', () => {
  const server = new ValkeyTestServer('identity');
  let users: AuthValkeyUsers;

  beforeAll(() => server.start(), 300_000);
  afterAll(() => server.stop());
  beforeEach(() => server.flush());

  beforeEach(async () => {
    users = new AuthValkeyUsers(server);
    await users.create();
  });

  afterEach(() => users.close());

  function stores(clock = new SystemClock()): {
    reader: ValkeyAuthStateReader;
    writer: ValkeyAuthStateWriter;
    feed: ValkeyAuthRevocationFeed;
  } {
    return {
      reader: new ValkeyAuthStateReader(
        ValkeyExecutors.over(users.readerClient()),
        clock,
      ),
      writer: new ValkeyAuthStateWriter(
        ValkeyExecutors.over(users.writerClient()),
        clock,
      ),
      feed: new ValkeyAuthRevocationFeed(
        new ValkeySubscriberSource(
          new UserConnectionOpener(() => users.readerClient()),
        ),
      ),
    };
  }

  runAuthStateContract('ValkeyAuthState', () => {
    const { reader, writer, feed } = stores();
    return { reader, writer, feed };
  });

  describe('users and ACL', () => {
    it('lets the reader read auth keys and refuses writes', async () => {
      const reader = users.readerClient();

      await expect(reader.call('GET', 'auth:revoked:x')).resolves.toBeNull();
      await expect(reader.call('SET', 'auth:revoked:x', '1')).rejects.toThrow(
        /NOPERM/,
      );
    });

    it('lets the reader subscribe to the revocations channel only', async () => {
      const reader = users.readerClient();

      await expect(reader.subscribe('auth:revocations')).resolves.toBeDefined();
      await expect(reader.subscribe('auth:other')).rejects.toThrow(/NOPERM/);
    });

    it('refuses the reader a publish on another channel', async () => {
      await expect(
        users.readerClient().call('PUBLISH', 'auth:other', 'x'),
      ).rejects.toThrow(/NOPERM/);
    });

    it('lets the writer set auth keys and publish', async () => {
      const writer = users.writerClient();

      await expect(
        writer.call('SET', 'auth:epoch:user:u1', '{}'),
      ).resolves.toBe('OK');
      await expect(
        writer.call('PUBLISH', 'auth:revocations', 's'),
      ).resolves.toBeDefined();
    });
  });

  describe('revocation lifecycle', () => {
    it('stops reporting a session once its revocation expires and drops it from the index', async () => {
      const { reader, writer } = stores();

      await writer.revokeSession('short', 1_500, RevocationReason.Logout);
      expect(await reader.isSessionRevoked('short')).toBe(true);

      await PollUntil.run(
        async () => !(await reader.isSessionRevoked('short')),
        10_000,
      );
      const sessions = (
        await AsyncBatches.collect(reader.revokedSessionIds())
      ).flat();
      expect(sessions).not.toContain('short');

      await writer.revokeSession('long', 60_000, RevocationReason.Logout);
      expect(
        await server.superuser.call(
          'ZSCORE',
          AuthStateKey.REVOKED_INDEX,
          'short',
        ),
      ).toBeNull();
    });

    it('returns every session of a large index', async () => {
      const { reader } = stores();
      const expiresAt = Date.now() + 60_000;
      const args = Array.from({ length: 2500 }, (_, index) => [
        String(expiresAt),
        `session-${index}`,
      ]).flat();
      await server.superuser.call('ZADD', AuthStateKey.REVOKED_INDEX, ...args);

      const sessions = new Set(
        (await AsyncBatches.collect(reader.revokedSessionIds())).flat(),
      );

      expect(sessions.size).toBe(2500);
    });

    it('delivers through the feed to a reader connection what the writer revokes', async () => {
      const { writer, feed } = stores();
      const seen: string[] = [];
      const stop = await feed.subscribe((sessionId) => {
        seen.push(sessionId);
      });

      await writer.revokeSession('via-feed', 60_000, RevocationReason.Logout);
      await PollUntil.run(() => seen.includes('via-feed'), 5_000);

      await stop();
    });
  });

  describe('local cache when Valkey goes away', () => {
    it('serves the last known epoch after the connection drops and fails for unknown keys', async () => {
      const { writer } = stores();
      await writer.setUserEpoch('u1', EPOCH);
      const client = users.readerClient();
      const clock = new FixedClock(new Date('2026-01-15T12:00:00.000Z'));
      const cached = new CachedAuthStateReader(
        new ValkeyAuthStateReader(
          ValkeyExecutors.over(client),
          new SystemClock(),
        ),
        new RevokedSessionRegistry(
          new InMemoryAsyncBloomFilter(
            BloomFilter.create({ expectedItems: 1000 }),
          ),
        ),
        clock,
        { ttlMs: 5000, maxEntries: 100 },
      );
      expect(await cached.userEpoch('u1')).toEqual(EPOCH);

      client.disconnect();
      clock.advance(10_000);

      expect(await cached.userEpoch('u1')).toEqual(EPOCH);
      await expect(cached.userEpoch('u2')).rejects.toMatchObject({
        code: 'PLATFORM.RESILIENCE.CIRCUIT_OPEN',
      });
    });
  });
});
