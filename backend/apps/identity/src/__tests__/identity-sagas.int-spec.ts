import { BillingEvent, BillingOperation } from '@contracts/billing';
import {
  IdentityEvent,
  IdentitySagaStatus,
  MembershipChangeKind,
  PlanFeature,
  TenantLifecycle,
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
import {
  IdentityJourney,
  IdentityTestApp,
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

  it('discards the tenant and frees its slug when billing refuses the account', async () => {
    peers.refuseAccountsOf(IdentityJourney.userIdFrom(beaSession.accessToken));

    const created = await bea
      .bearer(beaSession.accessToken)
      .post('/v1/tenants', { body: { slug: 'rechazado', name: 'Rechazado' } });
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
        .catalogRows(`SELECT 1 FROM tenant_lookup WHERE slug = 'rechazado'`),
    ).resolves.toEqual([]);
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

  it('deletes an account: every service erases its data and identity erases the user, its memberships and its email lookup', async () => {
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
      probe.rowsIn(
        await probe.shardOfTenant(acme.tenantId),
        `SELECT 1 FROM outbox WHERE envelope->>'type' = '${IdentityEvent.MembershipChanged}' AND envelope->'data'->>'userId' = '${userId}' AND envelope->'data'->>'kind' = '${MembershipChangeKind.Removed}'`,
      ),
    ).resolves.toHaveLength(1);
  });
});
