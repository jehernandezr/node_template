import {
  ApiKeyEnvironment,
  RevocationReason,
  type AccessGrant,
} from '@platform/auth';
import { FixedClock } from '@platform/kernel/test-utils';
import { PrimitivesErrorCode } from '@platform/primitives';
import {
  ScriptedValkeyRunner,
  ValkeyExecutors,
} from '../../__tests__/utils/index.js';
import { ValkeyAuthStateWriter } from '../valkey-auth-state-writer.js';

const NOW = new Date('2026-01-15T12:00:00.000Z');
const NOW_MS = NOW.getTime();
const HASH = 'e'.repeat(64);
const GRANT: AccessGrant = {
  permissions: [],
  platformRoles: [],
  features: [],
  flags: [],
  permissionVersion: '3.7',
};
const PRINCIPAL = {
  apiKeyId: 'key-1',
  serviceAccountId: 'service-1',
  tenantId: 'tenant-1',
  environment: ApiKeyEnvironment.Live,
  permissions: [],
};

function writerOver(): {
  runner: ScriptedValkeyRunner;
  writer: ValkeyAuthStateWriter;
} {
  const runner = new ScriptedValkeyRunner();
  const writer = new ValkeyAuthStateWriter(
    ValkeyExecutors.over(runner),
    new FixedClock(NOW),
  );
  return { runner, writer };
}

describe('ValkeyAuthStateWriter', () => {
  describe('revokeSession', () => {
    it('cleans the index, adds the session, sets its key and publishes, in that order', async () => {
      const { runner, writer } = writerOver();

      await writer.revokeSession('s1', 60_000, RevocationReason.Logout);

      expect(runner.calls).toEqual([
        ['ZREMRANGEBYSCORE', ['auth:revoked-index', '-inf', NOW_MS]],
        ['ZADD', ['auth:revoked-index', NOW_MS + 60_000, 's1']],
        ['SET', ['auth:revoked:s1', 'logout', 'PX', 60_000]],
        ['PUBLISH', ['auth:revocations', 's1']],
      ]);
    });

    it('rounds a fractional ttl up to the next millisecond', async () => {
      const { runner, writer } = writerOver();

      await writer.revokeSession('s1', 1500.2, RevocationReason.Compromised);

      expect(runner.calls[1]).toEqual([
        'ZADD',
        ['auth:revoked-index', NOW_MS + 1501, 's1'],
      ]);
      expect(runner.calls[2]).toEqual([
        'SET',
        ['auth:revoked:s1', 'compromised', 'PX', 1501],
      ]);
    });

    it.each([[0], [-5]])('sends nothing for a ttl of %p', async (ttlMs) => {
      const { runner, writer } = writerOver();

      await writer.revokeSession('s1', ttlMs, RevocationReason.Logout);

      expect(runner.calls).toEqual([]);
    });
  });

  describe('epochs', () => {
    it('stores the user epoch as JSON without an expiry', async () => {
      const { runner, writer } = writerOver();

      await writer.setUserEpoch('u1', { revokedBefore: 5, suspended: false });

      expect(runner.calls).toEqual([
        [
          'SET',
          ['auth:epoch:user:u1', '{"revokedBefore":5,"suspended":false}'],
        ],
      ]);
    });

    it('stores the tenant epoch as JSON without an expiry', async () => {
      const { runner, writer } = writerOver();

      await writer.setTenantEpoch('t1', { revokedBefore: 6, suspended: true });

      expect(runner.calls).toEqual([
        [
          'SET',
          ['auth:epoch:tenant:t1', '{"revokedBefore":6,"suspended":true}'],
        ],
      ]);
    });
  });

  describe('permission versions', () => {
    it('stores the tenant version under its own key', async () => {
      const { runner, writer } = writerOver();

      await writer.setPermissionVersion('t1', undefined, 3);

      expect(runner.calls).toEqual([['SET', ['auth:pv:tenant:t1', '3']]]);
    });

    it('stores the user version under the tenant and user key', async () => {
      const { runner, writer } = writerOver();

      await writer.setPermissionVersion('t1', 'u1', 7);

      expect(runner.calls).toEqual([['SET', ['auth:pv:user:t1:u1', '7']]]);
    });

    it.each([[-1], [1.5], [Number.NaN]])(
      'rejects the version %p before sending anything',
      async (version) => {
        const { runner, writer } = writerOver();

        await expect(
          writer.setPermissionVersion('t1', 'u1', version),
        ).rejects.toMatchObject({ code: PrimitivesErrorCode.InvalidArgument });
        expect(runner.calls).toEqual([]);
      },
    );
  });

  describe('access grants and API keys', () => {
    it('stores the grant with a 15 minute expiry', async () => {
      const { runner, writer } = writerOver();

      await writer.putAccessGrant('t1', 'u1', GRANT);

      expect(runner.calls).toEqual([
        ['SET', ['auth:access:t1:u1', JSON.stringify(GRANT), 'PX', 900_000]],
      ]);
    });

    it('stores the principal under the secret hash and sets a 60 second expiry on the key', async () => {
      const { runner, writer } = writerOver();

      await writer.putApiKey('abcd1234', HASH, PRINCIPAL);

      expect(runner.calls).toEqual([
        ['HSET', ['auth:apikey:abcd1234', HASH, JSON.stringify(PRINCIPAL)]],
        ['PEXPIRE', ['auth:apikey:abcd1234', 60_000]],
      ]);
    });

    it('drops the whole API key', async () => {
      const { runner, writer } = writerOver();

      await writer.dropApiKey('abcd1234');

      expect(runner.calls).toEqual([['DEL', ['auth:apikey:abcd1234']]]);
    });
  });
});
