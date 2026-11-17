import {
  ApiKeyEnvironment,
  IdentityErrorCode,
  Permission,
  ServiceAccountStatus,
  TenantKind,
  TenantLifecycle,
} from '@contracts/identity';
import { ApiKeyFormat } from '@platform/auth';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  InMemoryEphemeralStore,
  TestShardScopes,
} from '../../../__tests__/utils/index.js';
import { LockoutRules } from '../../../shared/constants/lockout.constants.js';
import { TestLoginLockout } from '../../authentication/__tests__/utils/index.js';
import { InMemoryTenantsFacade } from '../../tenants/__tests__/utils/index.js';
import {
  InMemoryApiKeyDirectory,
  InMemoryApiKeyRepository,
  InterleavingAuthState,
  TestApiKeySecretHasher,
} from './utils/index.js';
import { ApiKey } from '../domain/api-key.js';
import type { ServiceAccount } from '../domain/service-account.js';
import { EphemeralApiKeyUsageBuffer } from '../infrastructure/ephemeral-api-key-usage-buffer.js';
import { AuthenticateApiKey } from '../application/authenticate-api-key.use-case.js';
import { FlushApiKeyUsageJob } from '../application/flush-api-key-usage.job.js';

const TENANT = 'tenant-acme';
const PREFIX = 'ABCDEFGHJKLM';
const SECRET = 'a'.repeat(48);
const WRONG = 'b'.repeat(48);
const INSIDE = '203.0.113.9';
const OUTSIDE = '198.51.100.9';

describe('AuthenticateApiKey', () => {
  const build = () => {
    const clock = new FixedClock(new Date('2026-05-01T00:00:00.000Z'));
    const ephemeral = new InMemoryEphemeralStore(clock);
    const repository = new InMemoryApiKeyRepository();
    const directory = new InMemoryApiKeyDirectory();
    const hasher = new TestApiKeySecretHasher();
    const state = new InterleavingAuthState();
    const usage = new EphemeralApiKeyUsageBuffer(ephemeral);
    const scopes = TestShardScopes.create();
    const lockout = new TestLoginLockout(ephemeral, clock);
    const useCase = new AuthenticateApiKey(
      directory,
      repository,
      hasher,
      new InMemoryTenantsFacade().add({
        id: TENANT,
        slug: 'acme',
        name: 'Acme',
        region: 'eu',
        kind: TenantKind.Organization,
        status: TenantLifecycle.Active,
      }),
      lockout.lockout,
      lockout.keys,
      usage,
      state,
      scopes,
      clock,
    );
    const job = new FlushApiKeyUsageJob(usage, repository, scopes);
    const addKey = async (allowedCidrs: readonly string[]): Promise<void> => {
      await directory.register(PREFIX, TENANT);
      await repository.insertServiceAccount({
        id: 'sa-1',
        tenantId: TENANT,
        name: 'ERP',
        permissions: [Permission.IdentityMembersRead],
        status: ServiceAccountStatus.Active,
        createdAt: clock.now(),
      });
      await repository.insertKey(
        ApiKey.issue({
          id: 'key-1',
          tenantId: TENANT,
          serviceAccountId: 'sa-1',
          prefix: PREFIX,
          secretHmac: hasher.hmac(ApiKeyFormat.hashSecret(SECRET)),
          environment: ApiKeyEnvironment.Live,
          allowedCidrs,
          createdAt: clock.now(),
        }),
      );
    };
    return { useCase, job, repository, state, clock, addKey };
  };

  const raw = (secret: string): string => `sk_live_${PREFIX}_${secret}`;

  it('rejects a key limited by CIDR when the caller does not say its IP', async () => {
    const { useCase, addKey } = build();
    await addKey(['203.0.113.0/24']);

    await expect(useCase.execute(raw(SECRET))).rejects.toMatchObject({
      code: IdentityErrorCode.ApiKeyIpNotAllowed,
    });
    await expect(useCase.execute(raw(SECRET), OUTSIDE)).rejects.toMatchObject({
      code: IdentityErrorCode.ApiKeyIpNotAllowed,
    });
    await expect(useCase.execute(raw(SECRET), INSIDE)).resolves.toMatchObject({
      apiKeyId: 'key-1',
      tenantId: TENANT,
    });
  });

  it('never shares a key limited by CIDR, because the shared copy does not check the IP', async () => {
    const { useCase, state, addKey } = build();
    await addKey(['203.0.113.0/24']);

    await useCase.execute(raw(SECRET), INSIDE);

    await expect(
      state.apiKey(PREFIX, ApiKeyFormat.hashSecret(SECRET)),
    ).resolves.toBeUndefined();
  });

  it('shares a key without CIDR for the other services after a valid check', async () => {
    const { useCase, state, addKey } = build();
    await addKey([]);

    await useCase.execute(raw(SECRET));

    await expect(
      state.apiKey(PREFIX, ApiKeyFormat.hashSecret(SECRET)),
    ).resolves.toMatchObject({ apiKeyId: 'key-1', tenantId: TENANT });
  });

  it('drops the copy when the key is revoked between its check and the copy', async () => {
    const { useCase, state, repository, addKey } = build();
    await addKey([]);
    state.interleave(async () => {
      const key = await repository.findKey('key-1');
      key?.revoke();
      await repository.updateKey(key as ApiKey);
      await state.dropApiKey(PREFIX);
    });

    await useCase.execute(raw(SECRET));

    await expect(
      state.apiKey(PREFIX, ApiKeyFormat.hashSecret(SECRET)),
    ).resolves.toBeUndefined();
  });

  it('drops the copy when the account loses a permission between the check and the copy', async () => {
    const { useCase, state, repository, addKey } = build();
    await addKey([]);
    state.interleave(async () => {
      const account = await repository.findServiceAccount('sa-1');
      await repository.updateServiceAccount({
        ...(account as ServiceAccount),
        permissions: [],
      });
      await state.dropApiKey(PREFIX);
    });

    await useCase.execute(raw(SECRET));

    await expect(
      state.apiKey(PREFIX, ApiKeyFormat.hashSecret(SECRET)),
    ).resolves.toBeUndefined();
  });

  it('locks the prefix from an IP after repeated wrong secrets, even for the right one', async () => {
    const { useCase, addKey } = build();
    await addKey([]);

    for (let i = 0; i < LockoutRules.origin.maxFailures; i += 1) {
      await expect(useCase.execute(raw(WRONG), INSIDE)).rejects.toMatchObject({
        code: IdentityErrorCode.ApiKeyInvalid,
      });
    }

    await expect(useCase.execute(raw(SECRET), INSIDE)).rejects.toMatchObject({
      code: IdentityErrorCode.ApiKeyInvalid,
      details: { retryAfterSeconds: expect.any(Number) },
    });
    await expect(useCase.execute(raw(SECRET), OUTSIDE)).resolves.toMatchObject({
      apiKeyId: 'key-1',
    });
  });

  it('counts unknown prefixes and malformed keys as invalid', async () => {
    const { useCase } = build();

    await expect(useCase.execute(raw(SECRET), INSIDE)).rejects.toMatchObject({
      code: IdentityErrorCode.ApiKeyInvalid,
    });
    await expect(useCase.execute('sk_nada')).rejects.toMatchObject({
      code: IdentityErrorCode.ApiKeyInvalid,
    });
  });

  it('buffers the last use and the job writes it to the key', async () => {
    const { useCase, job, repository, clock, addKey } = build();
    await addKey([]);

    await useCase.execute(raw(SECRET));
    const usedAt = clock.now();
    await job.run();
    await job.run();

    expect(repository.touched.get('key-1')).toEqual(usedAt);
  });
});
