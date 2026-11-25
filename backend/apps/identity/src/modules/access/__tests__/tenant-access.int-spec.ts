import {
  ActivateTenantOperation,
  CreateTenantOperation,
  IdentityErrorCode,
  IdentityEvent,
  TenantKind,
  TenantRole,
} from '@contracts/identity';
import {
  DispatchOutcome,
  MessageDispatcher,
  MessagingErrorCode,
} from '@platform/messaging';
import { SessionSetting } from '@platform/persistence';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DataSource } from 'typeorm';
import {
  Eventually,
  IdentityTestApp,
  ShardedUsers,
  TestIds,
} from '../../../__tests__/utils/index.js';
import { SystemRolePermissions } from '../../../shared/constants/system-roles.constants.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { AccessFacade } from '../application/access.facade.js';
import { ManageMembers } from '../application/manage-members.use-case.js';
import { TenantAccessSetup } from '../application/tenant-access-setup.js';
import { TenantAccessRepository } from '../domain/access-store.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('tenant access on two shards', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  /** Each organization with its owner; the owners live in different shards. */
  const organizations: Array<{ tenantId: string; owner: UserRef }> = [];

  beforeAll(async () => {
    await app.start();
    const owners = await new ShardedUsers(app).oneInEachShard('dueno');
    for (const [index, { ref }] of [...owners.values()].entries()) {
      organizations.push({
        tenantId: await createOrganization(`org-${index}`, ref),
        owner: ref,
      });
    }
  });

  /** An organization with two owners and the owners group, in its shard. */
  const organizationWithTwoOwners = async (slug: string) => {
    const users = new ShardedUsers(app);
    const firstOwner = await users.register(`primera.${slug}@example.com`);
    const secondOwner = await users.register(`segunda.${slug}@example.com`);
    const tenantId = await createOrganization(slug, firstOwner);
    const probe = app.shards();
    const shard = await probe.shardOfTenant(tenantId);
    const [ownersGroup] = await probe.rowsIn<{ id: string }>(
      shard,
      `SELECT id FROM groups WHERE tenant_id = '${tenantId}' AND system_role = '${TenantRole.Owner}'`,
    );
    await app
      .get(TenantAccessSetup)
      .addMember(tenantId, secondOwner, [String(ownersGroup?.id)]);
    return { tenantId, shard, firstOwner, secondOwner };
  };

  /** Creates and activates an organization with its owner. */
  const createOrganization = async (
    slug: string,
    owner: UserRef,
  ): Promise<string> => {
    const tenantId = TestIds.next();
    await app.internal().invoke(CreateTenantOperation, {
      tenantId,
      slug,
      name: slug,
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: owner.userId,
    });
    await app.internal().invoke(ActivateTenantOperation, { tenantId });
    return tenantId;
  };

  afterAll(async () => {
    await app.stop();
  });

  it('places each organization on its own shard and keeps its rows there', async () => {
    const probe = app.shards();
    const shards = await Promise.all(
      organizations.map(({ tenantId }) => probe.shardOfTenant(tenantId)),
    );

    expect(new Set(shards).size).toBe(2);
    for (const [index, { tenantId, owner }] of organizations.entries()) {
      expect(
        await probe.shardsWith(
          `SELECT 1 FROM tenants WHERE id = '${tenantId}'`,
        ),
      ).toEqual([shards[index]]);
      expect(
        await probe.shardsWith(
          `SELECT 1 FROM tenant_members WHERE tenant_id = '${tenantId}' AND user_id = '${owner.userId}'`,
        ),
      ).toEqual([shards[index]]);
      expect(
        await probe.shardsWith(
          `SELECT 1 FROM user_tenants WHERE user_id = '${owner.userId}' AND tenant_id = '${tenantId}'`,
        ),
      ).toEqual([await probe.shardOfUser(owner)]);
    }
  });

  it('shows the service role only the rows of the tenant of the transaction', async () => {
    const [first, second] = organizations;
    if (first === undefined || second === undefined) {
      throw new Error('Organizations are missing');
    }
    const probe = app.shards();
    const source = new DataSource({
      type: 'postgres',
      ...probe.serviceConnection(),
      database: await probe.shardOfTenant(first.tenantId),
    });
    await source.initialize();
    const visible = async (tenant: string): Promise<number> => {
      const runner = source.createQueryRunner();
      await runner.startTransaction();
      try {
        await runner.query('SELECT set_config($1, $2, true)', [
          SessionSetting.TenantId,
          tenant,
        ]);
        const rows: Array<{ count: string }> = await runner.query(
          `SELECT count(*) AS count FROM tenant_members WHERE tenant_id = $1`,
          [first.tenantId],
        );
        return Number(rows[0]?.count ?? 0);
      } finally {
        await runner.rollbackTransaction();
        await runner.release();
      }
    };
    const writeAs = async (tenant: string): Promise<void> => {
      const runner = source.createQueryRunner();
      await runner.startTransaction();
      try {
        await runner.query('SELECT set_config($1, $2, true)', [
          SessionSetting.TenantId,
          tenant,
        ]);
        await runner.query(
          `UPDATE groups SET name = name WHERE tenant_id = $1`,
          [first.tenantId],
        );
        await runner.query(
          `INSERT INTO tenant_access_versions (id, version, tenant_id, permission_version) VALUES ($1, 1, $2, 1)`,
          [TestIds.next(), first.tenantId],
        );
      } finally {
        await runner.rollbackTransaction();
        await runner.release();
      }
    };
    try {
      await expect(visible(first.tenantId)).resolves.toBeGreaterThan(0);
      await expect(visible(second.tenantId)).resolves.toBe(0);
      await expect(writeAs(second.tenantId)).rejects.toThrow(
        /row-level security/,
      );
      await expect(writeAs(first.tenantId)).resolves.toBeUndefined();
    } finally {
      await source.destroy();
    }
  });

  it('rebuilds the user_tenants projection when the dispatcher delivers MembershipChanged, once', async () => {
    const [first] = organizations;
    if (first === undefined) {
      throw new Error('Organizations are missing');
    }
    const probe = app.shards();
    const userShard = await probe.shardOfUser(first.owner);
    const [published] = await probe.rowsIn<{ envelope: unknown }>(
      await probe.shardOfTenant(first.tenantId),
      `SELECT envelope FROM outbox WHERE envelope->>'type' = '${IdentityEvent.MembershipChanged}' AND envelope->'data'->>'userId' = '${first.owner.userId}' AND envelope->>'tenantid' = '${first.tenantId}'`,
    );
    await probe.rowsIn(
      userShard,
      `DELETE FROM user_tenants WHERE user_id = '${first.owner.userId}' AND tenant_id = '${first.tenantId}'`,
    );
    const dispatcher = app.get(MessageDispatcher);

    const delivered = await dispatcher.dispatch(published?.envelope, {
      receiveCount: 1,
    });
    const redelivered = await dispatcher.dispatch(published?.envelope, {
      receiveCount: 2,
    });

    expect(delivered.outcome).toBe(DispatchOutcome.Processed);
    expect(redelivered.outcome).toBe(DispatchOutcome.Duplicate);
    expect(
      await probe.shardsWith(
        `SELECT 1 FROM user_tenants WHERE user_id = '${first.owner.userId}' AND tenant_id = '${first.tenantId}'`,
      ),
    ).toEqual([userShard]);
    expect(
      await probe.shardsWith(
        `SELECT 1 FROM processed_messages WHERE key LIKE '%${String((published?.envelope as { id?: string } | undefined)?.id)}%'`,
      ),
    ).toEqual([await probe.shardOfTenant(first.tenantId)]);
  });

  it('sends a MembershipChanged of a tenant the directory does not know to the dead letter', async () => {
    const [first] = organizations;
    if (first === undefined) {
      throw new Error('Organizations are missing');
    }
    const [published] = await app
      .shards()
      .rowsIn<{ envelope: Record<string, unknown> }>(
        await app.shards().shardOfTenant(first.tenantId),
        `SELECT envelope FROM outbox WHERE envelope->>'type' = '${IdentityEvent.MembershipChanged}' AND envelope->>'tenantid' = '${first.tenantId}' LIMIT 1`,
      );

    const result = await app.get(MessageDispatcher).dispatch(
      {
        ...published?.envelope,
        id: TestIds.next(),
        tenantid: TestIds.next(),
      },
      { receiveCount: 1 },
    );

    expect(result).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.TenantMismatch,
    });
  });

  it('shows no rows to a read outside a transaction without a tenant in the session', async () => {
    const [first] = organizations;
    if (first === undefined) {
      throw new Error('Organizations are missing');
    }
    const probe = app.shards();
    const shard = await probe.shardOfTenant(first.tenantId);
    const source = new DataSource({
      type: 'postgres',
      ...probe.serviceConnection(),
      database: shard,
    });
    await source.initialize();
    try {
      const rows: Array<{ count: string }> = await source.query(
        'SELECT count(*) AS count FROM tenant_members',
      );

      expect(Number(rows[0]?.count)).toBe(0);
      expect(
        await probe.rowsIn(
          shard,
          `SELECT 1 FROM tenant_members WHERE tenant_id = '${first.tenantId}'`,
        ),
      ).not.toHaveLength(0);
    } finally {
      await source.destroy();
    }
  });

  it('lets a repository read outside a transaction only the rows of the tenant of its scope', async () => {
    const [first] = organizations;
    if (first === undefined) {
      throw new Error('Organizations are missing');
    }

    const memberships = await app
      .get(IdentityShardScopes)
      .inTenantShard(first.tenantId, () =>
        app.get(TenantAccessRepository).listMemberships(),
      );

    expect(memberships.map((membership) => membership.userId)).toEqual([
      first.owner.userId,
    ]);
  });

  it('reads a page of members after a user id, in ascending user id', async () => {
    const { tenantId, firstOwner, secondOwner } =
      await organizationWithTwoOwners('paginas');
    const [lower, higher] = [firstOwner.userId, secondOwner.userId].sort();
    const page = (after: string | undefined) =>
      app
        .get(IdentityShardScopes)
        .inTenantShard(tenantId, () =>
          app.get(TenantAccessRepository).listMembershipsAfter(after, 1),
        );

    const pages = [await page(undefined), await page(lower)];

    expect(
      pages.map((memberships) => memberships.map(({ userId }) => userId)),
    ).toEqual([[lower], [higher]]);
  });

  it('deletes on erasure the tombstone an earlier removal left in a tenant the user no longer belongs to', async () => {
    const { tenantId, firstOwner } = await organizationWithTwoOwners('lapida');
    await app
      .get(ManageMembers)
      .remove(
        tenantId,
        firstOwner.userId,
        SystemRolePermissions[TenantRole.Owner],
      );

    await app.get(AccessFacade).removeFromAllTenants(firstOwner);

    await expect(
      app
        .shards()
        .shardsWith(
          `SELECT 1 FROM tenant_members WHERE user_id = '${firstOwner.userId}'`,
        ),
    ).resolves.toEqual([]);
  });

  it('keeps one owner when two owners are removed at the same time', async () => {
    const { tenantId, shard, firstOwner, secondOwner } =
      await organizationWithTwoOwners('dos-duenas');
    const members = app.get(ManageMembers);
    const granted = SystemRolePermissions[TenantRole.Owner];

    const results = await Promise.allSettled([
      members.remove(tenantId, firstOwner.userId, granted),
      members.remove(tenantId, secondOwner.userId, granted),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(
      results.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      ),
    ).toEqual([
      expect.objectContaining({ code: IdentityErrorCode.AccessLastOwner }),
    ]);
    expect(
      await app
        .shards()
        .rowsIn(
          shard,
          `SELECT user_id FROM tenant_members WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL`,
        ),
    ).toHaveLength(1);
  });

  it('waits for a change of the same tenant in flight before checking the last owner', async () => {
    const { tenantId, shard, firstOwner, secondOwner } =
      await organizationWithTwoOwners('cambio-en-curso');
    const probe = app.shards();
    const source = new DataSource({
      type: 'postgres',
      ...probe.serviceConnection(),
      database: shard,
    });
    await source.initialize();
    const inFlight = source.createQueryRunner();
    try {
      await inFlight.startTransaction();
      await inFlight.query('SELECT set_config($1, $2, true)', [
        SessionSetting.TenantId,
        tenantId,
      ]);
      await inFlight.query(
        'SELECT 1 FROM tenant_access_versions WHERE id = $1 FOR UPDATE',
        [tenantId],
      );
      await inFlight.query(
        'DELETE FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, firstOwner.userId],
      );

      const removal = app
        .get(ManageMembers)
        .remove(
          tenantId,
          secondOwner.userId,
          SystemRolePermissions[TenantRole.Owner],
        );
      const outcome = removal.then(
        () => undefined,
        (error: unknown) => error,
      );
      await Eventually.until(
        async () =>
          (
            await probe.rowsIn(
              shard,
              "SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE '%tenant_access_versions%'",
            )
          ).length > 0,
        10_000,
      );
      await inFlight.commitTransaction();

      await expect(outcome).resolves.toMatchObject({
        code: IdentityErrorCode.AccessLastOwner,
      });
      expect(
        await probe.rowsIn(
          shard,
          `SELECT user_id FROM tenant_members WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL`,
        ),
      ).toEqual([{ user_id: secondOwner.userId }]);
    } finally {
      if (inFlight.isTransactionActive) {
        await inFlight.rollbackTransaction();
      }
      await inFlight.release();
      await source.destroy();
    }
  });
});
