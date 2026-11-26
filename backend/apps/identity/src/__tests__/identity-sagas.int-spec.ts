import { BillingEvent, BillingOperation } from '@contracts/billing';
import {
  ActivateTenantOperation,
  CreateTenantOperation,
  IdentityErrorCode,
  IdentityEvent,
  IdentitySagaStatus,
  MembershipChangeKind,
  PlanFeature,
  TenantKind,
  TenantLifecycle,
  TenantRole,
  UserStatus,
  type TenantCreation,
} from '@contracts/identity';
import { NotificationsOperation } from '@contracts/notifications';
import { ReportsOperation } from '@contracts/reports';
import { TasksOperation } from '@contracts/tasks';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DispatchOutcome, MessageDispatcher } from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { TenantDirectoryFollowers } from '../modules/tenants/index.js';
import { StartAccountDeletion } from '../modules/users/application/start-account-deletion.use-case.js';
import {
  IdentityJourney,
  IdentityTestApp,
  ShardedUsers,
  TenantAccessSetup,
  TestIds,
  type SessionTokensBody,
} from './utils/index.js';

new ContainerRuntime(process.env).describeIfAvailable('identity sagas', () => {
  jest.setTimeout(300_000);
  const app = new IdentityTestApp();
  const peers = app.peers;
  const ana = new IdentityJourney(app, 'ana.sagas@example.com');
  const bea = new IdentityJourney(app, 'bea.sagas@example.com');
  let anaSession: SessionTokensBody;
  let beaSession: SessionTokensBody;
  let acme: TenantCreation;

  beforeAll(async () => {
    await app.start();
    await ana.register();
    anaSession = await ana.signInWithEmailCode();
    await bea.register();
    beaSession = await bea.signInWithEmailCode();
  });

  afterAll(async () => {
    await app.stop();
  });

  const tenantStatus = async (tenantId: string) => {
    const probe = app.shards();
    return probe.rowsIn<{ status: string; plan_features: string[] | null }>(
      await probe.shardOfTenant(tenantId),
      `SELECT status, plan_features FROM tenants WHERE id = '${tenantId}'`,
    );
  };

  const deliver = (type: string, tenantId: string, data: object) =>
    app.get(MessageDispatcher).dispatch(
      EnvelopeBuilder.anEnvelope({
        id: TestIds.next(),
        type,
        source: 'billing',
        tenantid: tenantId,
        data,
      }),
      { receiveCount: 1 },
    );

  it('places the tenants of the region in the directory of every service when it seeds them', () => {
    const seeded = [
      String(app.env()['IDENTITY_DEFAULT_TENANT_ID']),
      String(app.env()['IDENTITY_PLATFORM_TENANT_ID']),
    ];

    for (const follower of TenantDirectoryFollowers.ALL) {
      expect([
        ...(peers.placed.get(follower.tenantDirectoryPlace.id) ?? []),
      ]).toEqual(expect.arrayContaining(seeded));
    }
  });

  it('onboards a tenant: creates it, places it in every service, opens its billing account, activates it and welcomes its owner', async () => {
    const created = await ana
      .bearer(anaSession.accessToken)
      .post('/v1/tenants', { body: { slug: 'acme-sagas', name: 'Acme' } });
    acme = created.body as TenantCreation;

    const saga = await ana
      .bearer(anaSession.accessToken)
      .get(`/v1/sagas/${acme.sagaId}`);

    expect(created.status).toBe(202);
    expect(saga.body).toMatchObject({
      sagaId: acme.sagaId,
      status: IdentitySagaStatus.Completed,
      finishedAt: expect.any(String),
    });
    await expect(tenantStatus(acme.tenantId)).resolves.toEqual([
      { status: TenantLifecycle.Active, plan_features: null },
    ]);
    expect(peers.received).toEqual(
      expect.arrayContaining([
        BillingOperation.OpenAccount,
        NotificationsOperation.NotifyUser,
      ]),
    );
    for (const follower of TenantDirectoryFollowers.ALL) {
      expect(peers.placed.get(follower.tenantDirectoryPlace.id)).toContain(
        acme.tenantId,
      );
    }
  });

  it('discards the tenant, its access and the projection of its owner when billing refuses the account', async () => {
    peers.refuseAccountsOf(IdentityJourney.userIdFrom(beaSession.accessToken));

    const created = await bea
      .bearer(beaSession.accessToken)
      .post('/v1/tenants', { body: { slug: 'rejected', name: 'Rejected' } });
    const { tenantId, sagaId } = created.body as TenantCreation;
    const saga = await bea
      .bearer(beaSession.accessToken)
      .get(`/v1/sagas/${sagaId}`);

    expect(saga.body).toMatchObject({
      status: IdentitySagaStatus.Compensated,
    });
    await expect(tenantStatus(tenantId)).resolves.toEqual([]);
    for (const follower of TenantDirectoryFollowers.ALL) {
      expect(peers.placed.get(follower.tenantDirectoryPlace.id)).not.toContain(
        tenantId,
      );
      expect(peers.received).toContain(follower.tenantDirectoryRemove.id);
    }
    await expect(
      app
        .shards()
        .catalogRows(`SELECT 1 FROM tenant_lookup WHERE slug = 'rejected'`),
    ).resolves.toEqual([]);
    await expect(
      app
        .shards()
        .shardsWith(
          [
            'tenant_members',
            'groups',
            'roles',
            'tenant_access_versions',
            'user_tenants',
          ]
            .map(
              (table) =>
                `SELECT 1 FROM ${table} WHERE tenant_id = '${tenantId}'`,
            )
            .join(' UNION ALL '),
        ),
    ).resolves.toEqual([]);
    const mine = await bea.bearer(beaSession.accessToken).get('/v1/me/tenants');
    expect(mine.status).toBe(200);
    expect(
      (mine.body as { items: Array<{ id: string }> }).items.map(
        (tenant) => tenant.id,
      ),
    ).not.toContain(tenantId);
  });

  it('shows a saga only to whoever started it', async () => {
    const response = await bea
      .bearer(beaSession.accessToken)
      .get(`/v1/sagas/${acme.sagaId}`);

    expect(response.status).toBe(404);
  });

  it('stores the plan features that billing reports and suspends and reactivates the tenant with its subscription', async () => {
    const features = await deliver(
      BillingEvent.EntitlementsChanged,
      acme.tenantId,
      {
        tenantId: acme.tenantId,
        features: [PlanFeature.AdvancedReports],
        quotas: [],
        changedAt: new Date().toISOString(),
      },
    );
    const suspended = await deliver(
      BillingEvent.SubscriptionSuspended,
      acme.tenantId,
      {
        tenantId: acme.tenantId,
        subscriptionId: acme.tenantId,
        suspendedAt: new Date().toISOString(),
      },
    );
    const afterSuspension = await tenantStatus(acme.tenantId);
    await deliver(BillingEvent.SubscriptionReactivated, acme.tenantId, {
      tenantId: acme.tenantId,
      subscriptionId: acme.tenantId,
      reactivatedAt: new Date().toISOString(),
    });

    expect([features.outcome, suspended.outcome]).toEqual([
      DispatchOutcome.Processed,
      DispatchOutcome.Processed,
    ]);
    expect(afterSuspension).toEqual([
      {
        status: TenantLifecycle.Suspended,
        plan_features: [PlanFeature.AdvancedReports],
      },
    ]);
    await expect(tenantStatus(acme.tenantId)).resolves.toMatchObject([
      { status: TenantLifecycle.Active },
    ]);
  });

  it('deletes an account: every service erases its data and identity erases the user, its memberships, its sessions, its sign-in history, its second factors and its email lookup', async () => {
    const userId = IdentityJourney.userIdFrom(anaSession.accessToken);

    const started = await ana
      .bearer(anaSession.accessToken)
      .post('/v1/me/deletion');
    const { sagaId } = started.body as { sagaId: string };
    const probe = app.shards();
    const users = await probe.rowsIn<{ status: string; email: string }>(
      (
        await probe.shardsWith(`SELECT 1 FROM users WHERE id = '${userId}'`)
      )[0] ?? '',
      `SELECT status, email FROM users WHERE id = '${userId}'`,
    );

    expect(started.status).toBe(202);
    expect(users).toEqual([
      { status: UserStatus.Deleted, email: `${userId}@erased.invalid` },
    ]);
    await expect(
      probe.catalogRows(
        `SELECT 1 FROM identity_lookup WHERE user_id = '${userId}'`,
      ),
    ).resolves.toEqual([]);
    await expect(
      probe.catalogRows(
        `SELECT saga FROM identity_sagas WHERE saga_id = '${sagaId}'`,
      ),
    ).resolves.toHaveLength(1);
    await expect(
      probe.shardsWith(
        `SELECT 1 FROM password_credentials WHERE id = '${userId}'`,
      ),
    ).resolves.toEqual([]);
    await expect(
      probe.shardsWith(
        `SELECT 1 FROM devices WHERE user_id = '${userId}' AND removed_at IS NULL`,
      ),
    ).resolves.toEqual([]);
    expect(peers.received).toEqual(
      expect.arrayContaining([
        TasksOperation.EraseUserData,
        NotificationsOperation.EraseUserData,
        ReportsOperation.EraseUserData,
      ]),
    );
    await expect(
      probe.shardsWith(
        `SELECT 1 FROM outbox WHERE envelope->>'type' = '${IdentityEvent.UserErased}' AND envelope->'data'->>'userId' = '${userId}'`,
      ),
    ).resolves.toHaveLength(1);
    await expect(
      probe.shardsWith(
        `SELECT 1 FROM tenant_members WHERE user_id = '${userId}'`,
      ),
    ).resolves.toEqual([]);
    await expect(
      probe.shardsWith(
        ['sessions', 'login_attempts', 'recovery_codes', 'mfa_recoveries']
          .map((table) => `SELECT 1 FROM ${table} WHERE user_id = '${userId}'`)
          .join(' UNION ALL '),
      ),
    ).resolves.toEqual([]);
    await expect(
      probe.rowsIn(
        await probe.shardOfTenant(acme.tenantId),
        `SELECT 1 FROM outbox WHERE envelope->>'type' = '${IdentityEvent.MembershipChanged}' AND envelope->'data'->>'tenantId' = '${acme.tenantId}' AND envelope->'data'->>'userId' = '${userId}' AND envelope->'data'->>'kind' = '${MembershipChangeKind.Removed}'`,
      ),
    ).resolves.toHaveLength(1);
  });

  it('keeps an owner when a second owner asks to delete their account while the deletion of the first is in flight', async () => {
    const users = new ShardedUsers(app);
    const first = await users.register('first.removals@example.com');
    const second = await users.register('second.removals@example.com');
    const member = await users.register('member.removals@example.com');
    const tenantId = TestIds.next();
    await app.internal().invoke(CreateTenantOperation, {
      tenantId,
      slug: 'two-removals',
      name: 'two-removals',
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: first.userId,
    });
    await app.internal().invoke(ActivateTenantOperation, { tenantId });
    const probe = app.shards();
    const shard = await probe.shardOfTenant(tenantId);
    const [owners] = await probe.rowsIn<{ id: string }>(
      shard,
      `SELECT id FROM groups WHERE tenant_id = '${tenantId}' AND system_role = '${TenantRole.Owner}'`,
    );
    await app
      .get(TenantAccessSetup)
      .addMember(tenantId, second, [String(owners?.id)]);
    await app.get(TenantAccessSetup).addMember(tenantId, member, []);
    const hold = peers.holdErasureOf(first.userId);
    const firstDeletion = app.get(StartAccountDeletion).execute(first);
    await hold.reached;

    const secondDeletion = await app
      .get(StartAccountDeletion)
      .execute(second)
      .then(
        () => undefined,
        (error: unknown) => error,
      );

    hold.release();
    await firstDeletion;
    expect(secondDeletion).toMatchObject({
      code: IdentityErrorCode.AccessLastOwner,
    });
    const remaining = await probe.rowsIn<{ user_id: string }>(
      shard,
      `SELECT user_id FROM tenant_members WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL`,
    );
    expect(remaining).toHaveLength(2);
    expect(remaining).toEqual(
      expect.arrayContaining([
        { user_id: second.userId },
        { user_id: member.userId },
      ]),
    );
  });
});
