import {
  ActivateTenantOperation,
  AuthenticateApiKeyOperation,
  CreateTenantOperation,
  IdentityErrorCode,
  Permission,
  TenantKind,
} from '@contracts/identity';
import { ApiKeyFormat, AuthStateReader } from '@platform/auth';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import type { HttpTestClient } from '@platform/http/test-utils';
import {
  IdentityJourney,
  IdentityTestApp,
  ShardedUsers,
  TestIds,
  type PlacedUser,
  type SessionTokensBody,
} from '../../../__tests__/utils/index.js';
import { FlushApiKeyUsageJob } from '../application/flush-api-key-usage.job.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable(
  'API key authentication with its shared copy',
  () => {
    jest.setTimeout(180_000);

    const app = new IdentityTestApp();
    const tenantId = TestIds.next();
    let owner: HttpTestClient;

    beforeAll(async () => {
      await app.start();
      const olga = new IdentityJourney(app, 'olga.llaves@example.com');
      await olga.register();
      const session = await olga.signInWithEmailCode();
      await app.internal().invoke(CreateTenantOperation, {
        tenantId,
        slug: 'llaves',
        name: 'Llaves',
        region: 'eu',
        kind: TenantKind.Organization,
        ownerUserId: IdentityJourney.userIdFrom(session.accessToken),
      });
      await app.internal().invoke(ActivateTenantOperation, { tenantId });
      const switched = await olga
        .bearer(session.accessToken)
        .post('/v1/me/tenant-switch', { body: { tenantId } });
      owner = olga.bearer((switched.body as SessionTokensBody).accessToken);
    });

    afterAll(async () => {
      await app.stop();
    });

    /** A new organization with its owner, and the owner's client with the session in it. */
    const organizationOf = async (
      user: PlacedUser,
    ): Promise<{ tenantId: string; client: HttpTestClient }> => {
      const journey = new IdentityJourney(app, user.email);
      const session = await journey.signInWithEmailCode();
      const organization = TestIds.next();
      await app.internal().invoke(CreateTenantOperation, {
        tenantId: organization,
        slug: `llaves-${organization.slice(-12)}`,
        name: 'Llaves',
        region: 'eu',
        kind: TenantKind.Organization,
        ownerUserId: user.ref.userId,
      });
      await app
        .internal()
        .invoke(ActivateTenantOperation, { tenantId: organization });
      const switched = await journey
        .bearer(session.accessToken)
        .post('/v1/me/tenant-switch', { body: { tenantId: organization } });
      return {
        tenantId: organization,
        client: journey.bearer(
          (switched.body as SessionTokensBody).accessToken,
        ),
      };
    };

    const issueKey = async (
      client: HttpTestClient = owner,
    ): Promise<{ id: string; secret: string }> => {
      const account = await client.post('/v1/tenant/service-accounts', {
        body: {
          name: `Cuenta ${TestIds.next()}`,
          permissions: [Permission.IdentityMembersRead],
        },
      });
      const created = await client.post(
        `/v1/tenant/service-accounts/${(account.body as { id: string }).id}/api-keys`,
        { body: { environment: 'live', allowedCidrs: [] } },
      );
      const body = created.body as { secret: string; apiKey: { id: string } };
      return { id: body.apiKey.id, secret: body.secret };
    };

    const copyOf = (secret: string) => {
      const parsed = ApiKeyFormat.parse(secret);
      if (parsed === undefined) {
        throw new Error('La key no tiene el formato esperado');
      }
      return app
        .get(AuthStateReader)
        .apiKey(parsed.prefix, ApiKeyFormat.hashSecret(parsed.secret));
    };

    it('keeps the key in the shard of its tenant and its prefix in the catalog', async () => {
      const { id, secret } = await issueKey();
      const probe = app.shards();
      const prefix = ApiKeyFormat.parse(secret)?.prefix ?? '';

      expect(
        await probe.shardsWith(`SELECT 1 FROM api_keys WHERE id = '${id}'`),
      ).toEqual([await probe.shardOfTenant(tenantId)]);
      expect(
        await probe.catalogRows(
          `SELECT tenant_id FROM api_key_lookup WHERE prefix = '${prefix}'`,
        ),
      ).toEqual([{ tenant_id: tenantId }]);
    });

    it('authenticates the keys of owners from each shard, each in the shard of its tenant', async () => {
      const placed = await new ShardedUsers(app).oneInEachShard('llavero');

      const outcomes = await Promise.all(
        [...placed.values()].map(async (user) => {
          const { tenantId: organization, client } = await organizationOf(user);
          const { id, secret } = await issueKey(client);
          const probe = app.shards();
          return {
            authenticated: await app
              .internal()
              .invoke(AuthenticateApiKeyOperation, { apiKey: secret }),
            rows: await probe.shardsWith(
              `SELECT 1 FROM api_keys WHERE id = '${id}'`,
            ),
            expected: {
              tenantId: organization,
              shard: await probe.shardOfTenant(organization),
            },
          };
        }),
      );

      expect(
        outcomes.map(({ authenticated, rows }) => ({ authenticated, rows })),
      ).toEqual(
        outcomes.map(({ expected }) => ({
          authenticated: expect.objectContaining({
            kind: CallOutcomeKind.Success,
            value: expect.objectContaining({ tenantId: expected.tenantId }),
          }),
          rows: [expected.shard],
        })),
      );
    });

    it('shares a valid key in Valkey and drops the copy when the key is revoked', async () => {
      const { id, secret } = await issueKey();

      const first = await app
        .internal()
        .invoke(AuthenticateApiKeyOperation, { apiKey: secret });
      const shared = await copyOf(secret);
      const revoked = await owner.delete(`/v1/tenant/api-keys/${id}`);
      const afterRevoke = await copyOf(secret);
      const rejected = await app
        .internal()
        .invoke(AuthenticateApiKeyOperation, { apiKey: secret });

      expect(first).toMatchObject({ kind: CallOutcomeKind.Success });
      expect(shared).toMatchObject({ apiKeyId: id, tenantId });
      expect(revoked.status).toBe(204);
      expect(afterRevoke).toBeUndefined();
      expect(rejected).toMatchObject({ code: IdentityErrorCode.ApiKeyInvalid });
    });

    it('writes the last use to the key when the job flushes the buffer', async () => {
      const { id, secret } = await issueKey();
      await app
        .internal()
        .invoke(AuthenticateApiKeyOperation, { apiKey: secret });

      await app.get(FlushApiKeyUsageJob).run();

      const probe = app.shards();
      expect(
        await probe.rowsIn(
          await probe.shardOfTenant(tenantId),
          `SELECT last_used_at IS NOT NULL AS used FROM api_keys WHERE id = '${id}'`,
        ),
      ).toEqual([{ used: true }]);
    });
  },
);
