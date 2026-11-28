import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { FixedClock } from '@platform/kernel/test-utils';
import { FakeAccessGrantSource } from '../../__tests__/utils/fake-access-grant-source.js';
import { InMemoryAuthState } from '../../__tests__/utils/in-memory-auth-state.js';
import type { AccessGrant } from '../access-grant.js';
import { CachedAccessResolver } from '../cached-access-resolver.js';

const START = new Date('2026-01-15T12:00:00.000Z');

const GRANT: AccessGrant = {
  permissions: [Permission.TasksRead, Permission.TasksWrite],
  platformRoles: [PlatformRole.ReadOnly],
  features: [PlanFeature.Webhooks],
  flags: [FeatureFlag.NewReports],
  permissionVersion: '2.5',
};

const SOURCE_GRANT: AccessGrant = { ...GRANT, permissionVersion: '4.1' };

describe('CachedAccessResolver', () => {
  let state: InMemoryAuthState;
  let source: FakeAccessGrantSource;
  let clock: FixedClock;
  let resolver: CachedAccessResolver;

  beforeEach(() => {
    state = new InMemoryAuthState();
    source = new FakeAccessGrantSource();
    clock = new FixedClock(START);
    resolver = new CachedAccessResolver(state, source, clock, {
      ttlMs: 5000,
      maxEntries: 100,
    });
  });

  describe('reads from the shared copy first', () => {
    it('returns the grant held in the state without asking the source', async () => {
      await state.putAccessGrant('tenant-1', 'user-1', GRANT);

      expect(await resolver.resolve('tenant-1', 'user-1')).toEqual(GRANT);
      expect(source.fetchCount).toBe(0);
    });

    it('does not read the state again within the ttl', async () => {
      await state.putAccessGrant('tenant-1', 'user-1', GRANT);

      await resolver.resolve('tenant-1', 'user-1');
      await resolver.resolve('tenant-1', 'user-1');

      expect(state.count('accessGrant')).toBe(1);
    });

    it('reads the state again once the ttl has passed', async () => {
      await state.putAccessGrant('tenant-1', 'user-1', GRANT);
      await resolver.resolve('tenant-1', 'user-1');
      clock.advance(5000);

      await resolver.resolve('tenant-1', 'user-1');

      expect(state.count('accessGrant')).toBe(2);
    });
  });

  describe('falls back to the source', () => {
    it('takes a missing grant from the source and caches it', async () => {
      source.set('tenant-1', 'user-1', SOURCE_GRANT);

      expect(await resolver.resolve('tenant-1', 'user-1')).toEqual(
        SOURCE_GRANT,
      );
      expect(await resolver.resolve('tenant-1', 'user-1')).toEqual(
        SOURCE_GRANT,
      );
      expect(source.fetchCount).toBe(1);
    });

    it('takes the grant from the source when the state is down', async () => {
      source.set('tenant-1', 'user-1', SOURCE_GRANT);
      state.failure = new Error('down');

      expect(await resolver.resolve('tenant-1', 'user-1')).toEqual(
        SOURCE_GRANT,
      );
    });

    it('rejects with a dependency unavailable error when neither the state nor the source answer', async () => {
      state.failure = new Error('down');
      source.failure = new Error('identity down');

      await expect(
        resolver.resolve('tenant-1', 'user-1'),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });

    it('serves the expired cached grant when the state and the source are down', async () => {
      await state.putAccessGrant('tenant-1', 'user-1', GRANT);
      expect(await resolver.resolve('tenant-1', 'user-1')).toEqual(GRANT);
      clock.advance(5000);
      state.failure = new Error('down');
      source.failure = new Error('identity down');

      expect(await resolver.resolve('tenant-1', 'user-1')).toEqual(GRANT);
    });
  });
});
