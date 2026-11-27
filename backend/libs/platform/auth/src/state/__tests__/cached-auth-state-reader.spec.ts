import { RevocationReason } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { BloomFilter, InMemoryAsyncBloomFilter } from '@platform/bloom';
import { FixedClock } from '@platform/kernel/test-utils';
import type { AccessGrant } from '../../access/access-grant.js';
import { ApiKeyEnvironment } from '../../api-keys/api-key-environment.enum.js';
import type { ApiKeyPrincipal } from '../../api-keys/api-key-principal.js';
import { InMemoryAuthState } from '../../__tests__/utils/in-memory-auth-state.js';
import { CachedAuthStateReader } from '../cached-auth-state-reader.js';
import type { Epoch } from '../epoch.js';
import type { PermissionVersion } from '../permission-version.js';
import { RevokedSessionRegistry } from '../revoked-session-registry.js';

const START = new Date('2026-01-15T12:00:00.000Z');
const EPOCH: Epoch = { revokedBefore: 1_700_000_000, suspended: false };
const VERSION: PermissionVersion = { tenant: 3, user: 7 };
const HASH = 'a'.repeat(64);
const GRANT: AccessGrant = {
  permissions: [],
  platformRoles: [],
  features: [],
  flags: [],
  permissionVersion: '3.7',
};
const PRINCIPAL: ApiKeyPrincipal = {
  apiKeyId: 'key-1',
  serviceAccountId: 'service-1',
  tenantId: 'tenant-1',
  environment: ApiKeyEnvironment.Live,
  permissions: [],
};

interface ReadCase {
  readonly name: string;
  readonly operation: string;
  readonly seed: (state: InMemoryAuthState) => Promise<void>;
  readonly read: (reader: CachedAuthStateReader) => Promise<unknown>;
  readonly value: unknown;
}

const READ_CASES: readonly ReadCase[] = [
  {
    name: 'userEpoch',
    operation: 'userEpoch',
    seed: (state) => state.setUserEpoch('user-1', EPOCH),
    read: (reader) => reader.userEpoch('user-1'),
    value: EPOCH,
  },
  {
    name: 'tenantEpoch',
    operation: 'tenantEpoch',
    seed: (state) => state.setTenantEpoch('tenant-1', EPOCH),
    read: (reader) => reader.tenantEpoch('tenant-1'),
    value: EPOCH,
  },
  {
    name: 'permissionVersion',
    operation: 'permissionVersion',
    seed: async (state) => {
      await state.setPermissionVersion('tenant-1', undefined, VERSION.tenant);
      await state.setPermissionVersion('tenant-1', 'user-1', VERSION.user);
    },
    read: (reader) => reader.permissionVersion('tenant-1', 'user-1'),
    value: VERSION,
  },
];

describe('CachedAuthStateReader', () => {
  let state: InMemoryAuthState;
  let clock: FixedClock;
  let registry: RevokedSessionRegistry;
  let reader: CachedAuthStateReader;

  beforeEach(() => {
    state = new InMemoryAuthState();
    clock = new FixedClock(START);
    registry = new RevokedSessionRegistry(
      new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems: 1000 })),
    );
    reader = new CachedAuthStateReader(state, registry, clock, {
      ttlMs: 5000,
      maxEntries: 100,
    });
  });

  describe('epochs and permission versions', () => {
    it.each(READ_CASES)(
      '$name is read once within the ttl and again after it',
      async ({ seed, read, operation, value }) => {
        await seed(state);

        expect(await read(reader)).toEqual(value);
        expect(await read(reader)).toEqual(value);
        expect(state.count(operation)).toBe(1);

        clock.advance(5000);
        expect(await read(reader)).toEqual(value);
        expect(state.count(operation)).toBe(2);
      },
    );

    it.each(READ_CASES)(
      '$name caches an absent value too',
      async ({ read, operation }) => {
        expect(await read(reader)).toBeUndefined();
        expect(await read(reader)).toBeUndefined();

        expect(state.count(operation)).toBe(1);
      },
    );

    it.each(READ_CASES)(
      '$name serves the last known value when Valkey fails after the ttl',
      async ({ seed, read, value }) => {
        await seed(state);
        expect(await read(reader)).toEqual(value);

        clock.advance(5000);
        state.failure = new Error('down');

        expect(await read(reader)).toEqual(value);
      },
    );

    it.each(READ_CASES)(
      '$name rejects with a circuit open error when Valkey fails and nothing is cached',
      async ({ read }) => {
        state.failure = new Error('down');

        await expect(read(reader)).rejects.toMatchObject({
          code: PlatformErrorCode.DependencyUnavailable,
        });
      },
    );

    it('evicts the least recently used key beyond maxEntries and reads it again', async () => {
      const small = new CachedAuthStateReader(state, registry, clock, {
        ttlMs: 5000,
        maxEntries: 2,
      });

      await small.userEpoch('user-1');
      await small.userEpoch('user-2');
      await small.userEpoch('user-3');
      expect(state.count('userEpoch')).toBe(3);

      await small.userEpoch('user-2');
      expect(state.count('userEpoch')).toBe(3);

      await small.userEpoch('user-1');
      expect(state.count('userEpoch')).toBe(4);
    });
  });

  describe('session revocation', () => {
    it('answers false without asking Valkey when the registry is warm and the session is not in it', async () => {
      await registry.rebuild([[]]);

      expect(await reader.isSessionRevoked('live-session')).toBe(false);
      expect(state.count('isSessionRevoked')).toBe(0);
    });

    it('answers true when the session is revoked and in the registry', async () => {
      await state.revokeSession('session-1', 60_000, RevocationReason.Logout);
      await registry.rebuild([[]]);
      await registry.add('session-1');

      expect(await reader.isSessionRevoked('session-1')).toBe(true);
    });

    it('confirms with Valkey a session the registry says might be revoked', async () => {
      await registry.rebuild([[]]);
      await registry.add('session-2');

      expect(await reader.isSessionRevoked('session-2')).toBe(false);
      expect(state.count('isSessionRevoked')).toBe(1);
    });

    it('asks Valkey every time while the registry is cold', async () => {
      await state.revokeSession('session-3', 60_000, RevocationReason.Logout);

      expect(await reader.isSessionRevoked('session-3')).toBe(true);
      expect(await reader.isSessionRevoked('session-4')).toBe(false);
      expect(state.count('isSessionRevoked')).toBe(2);
    });

    it('rejects with a circuit open error when a maybe-revoked session cannot be confirmed', async () => {
      await registry.rebuild([[]]);
      await registry.add('session-5');
      state.failure = new Error('down');

      await expect(reader.isSessionRevoked('session-5')).rejects.toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });
  });

  describe('pass-through reads', () => {
    it('returns the access grant stored in the state', async () => {
      await state.putAccessGrant('tenant-1', 'user-1', GRANT);

      expect(await reader.accessGrant('tenant-1', 'user-1')).toEqual(GRANT);
    });

    it('rethrows the state failure of an access grant unchanged', async () => {
      const failure = new Error('down');
      state.failure = failure;

      await expect(reader.accessGrant('tenant-1', 'user-1')).rejects.toBe(
        failure,
      );
    });

    it('returns the API key principal stored in the state', async () => {
      await state.putApiKey('abcd1234', HASH, PRINCIPAL);

      expect(await reader.apiKey('abcd1234', HASH)).toEqual(PRINCIPAL);
    });

    it('rethrows the state failure of an API key unchanged', async () => {
      const failure = new Error('down');
      state.failure = failure;

      await expect(reader.apiKey('abcd1234', HASH)).rejects.toBe(failure);
    });

    it('yields the revoked sessions of the state', async () => {
      await state.revokeSession('session-6', 60_000, RevocationReason.Logout);

      expect(
        (await reader.revokedSessionIds()[Symbol.asyncIterator]().next()).value,
      ).toEqual(['session-6']);
    });

    it('rethrows the state failure of the revoked sessions unchanged', async () => {
      const failure = new Error('down');
      state.failure = failure;

      await expect(
        reader.revokedSessionIds()[Symbol.asyncIterator]().next(),
      ).rejects.toBe(failure);
    });
  });
});
