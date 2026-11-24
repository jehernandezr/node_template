import { UsageMetric } from '@contracts/billing';
import {
  ActivateTenantOperation,
  BillingReference,
  AuthenticateApiKeyOperation,
  CreateTenantOperation,
  DiscardTenantOperation,
  GetUserAccessOperation,
  ListMembersByPermissionOperation,
  Permission,
  ReactivateTenantOperation,
  ReactivateUserOperation,
  RevokeUserSessionsOperation,
  SuspendTenantOperation,
  SuspendUserOperation,
  TenantKind,
  TenantRole,
  IdentityErrorCode,
} from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { AuthModuleRules } from '@platform/auth/nest';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import type { HttpTestClient } from '@platform/http/test-utils';
import { IdentityTestApp } from '../src/__tests__/utils/index.js';
import { IdentityEmailTemplate } from '../src/shared/enums/identity-email-template.enum.js';
import { TenantAccessSetup } from '../src/modules/access/application/tenant-access-setup.js';
import {
  IdentityJourney,
  TestIds,
  type SessionTokensBody,
} from '../src/__tests__/utils/index.js';

const runtime = new ContainerRuntime(process.env);
/**
 * Las cuotas que identity consultó a billing valen 10 s en su caché: el reintento se repite hasta que vencen, con
 * este plazo máximo para no colgar la prueba si nunca pasa.
 */
const RETRY_DEADLINE_MS = 30_000;
/** Pausa entre reintentos del registro, para no llegar al límite de tasa de las rutas de autenticación. */
const RETRY_PAUSE_MS = 1_500;

interface Named {
  readonly id: string;
  readonly name: string;
  readonly system?: boolean;
}

runtime.describeIfAvailable('tenant administration end to end', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  const olga = new IdentityJourney(app, 'olga.duena@example.com');
  const tenantId = TestIds.next();
  let ownerId: string;
  let ownerSession: SessionTokensBody;
  let owner: HttpTestClient;
  let auditGroupId: string;

  beforeAll(async () => {
    await app.start();
    await olga.register();
    ownerSession = await olga.signInWithEmailCode();
    ownerId = IdentityJourney.userIdFrom(ownerSession.accessToken);
  });

  afterAll(async () => {
    await app.stop();
  });

  it('creates and activates an organization through the internal operations', async () => {
    const created = await app.internal().invoke(CreateTenantOperation, {
      tenantId,
      slug: 'acme',
      name: 'Acme',
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: ownerId,
    });
    const taken = await app.internal().invoke(CreateTenantOperation, {
      tenantId: TestIds.next(),
      slug: 'acme',
      name: 'Otra Acme',
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: ownerId,
    });
    const activated = await app
      .internal()
      .invoke(ActivateTenantOperation, { tenantId });

    expect(created).toEqual(
      expect.objectContaining({ kind: CallOutcomeKind.Success }),
    );
    expect(created).toMatchObject({
      kind: CallOutcomeKind.Success,
      value: { id: tenantId, status: 'provisioning' },
    });
    expect(taken).toMatchObject({ code: IdentityErrorCode.TenantSlugTaken });
    expect(activated).toMatchObject({ value: { status: 'active' } });
  });

  it('switches the session to the new tenant and manages it', async () => {
    const switched = await olga
      .bearer(ownerSession.accessToken)
      .post('/v1/me/tenant-switch', { body: { tenantId } });
    owner = olga.bearer((switched.body as SessionTokensBody).accessToken);

    const mine = await owner.get('/v1/me/tenants');
    const renamed = await owner.patch('/v1/tenant', {
      body: { name: 'Acme SA' },
    });
    const current = await owner.get('/v1/tenant');

    expect(switched.status).toBe(200);
    expect((mine.body as { items: unknown[] }).items).toHaveLength(2);
    expect(renamed.body).toMatchObject({ name: 'Acme SA' });
    expect(current.body).toMatchObject({ id: tenantId, slug: 'acme' });
  });

  it('manages roles and groups and protects the system ones', async () => {
    const roles = await owner.get('/v1/tenant/roles');
    const created = await owner.post('/v1/tenant/roles', {
      body: {
        name: 'Auditores',
        permissions: [Permission.IdentityMembersRead],
      },
    });
    const roleId = (created.body as Named).id;
    const renamedRole = await owner.patch(`/v1/tenant/roles/${roleId}`, {
      body: { name: 'Auditoría' },
    });
    const group = await owner.post('/v1/tenant/groups', {
      body: { name: 'Auditoría' },
    });
    auditGroupId = (group.body as Named).id;
    const duplicated = await owner.post('/v1/tenant/groups', {
      body: { name: 'Auditoría' },
    });
    const setRoles = await owner.put(
      `/v1/tenant/groups/${auditGroupId}/roles`,
      {
        body: { roleIds: [roleId] },
      },
    );
    const renamedGroup = await owner.patch(
      `/v1/tenant/groups/${auditGroupId}`,
      {
        body: { name: 'Auditores' },
      },
    );
    const groups = await owner.get('/v1/tenant/groups');
    const systemGroup = (groups.body as { items: Named[] }).items.find(
      (g) => g.system,
    );
    const deleteSystem = await owner.delete(
      `/v1/tenant/groups/${systemGroup?.id ?? ''}`,
    );
    const systemRole = (roles.body as { items: Named[] }).items[0];
    const editSystem = await owner.patch(
      `/v1/tenant/roles/${systemRole?.id ?? ''}`,
      {
        body: { name: 'Otro' },
      },
    );
    const ungrantable = await owner.post('/v1/tenant/roles', {
      body: { name: 'Backoffice', permissions: [Permission.BackofficeAccess] },
    });
    const throwaway = await owner.post('/v1/tenant/roles', {
      body: { name: 'Temporal', permissions: [] },
    });
    const deleted = await owner.delete(
      `/v1/tenant/roles/${(throwaway.body as Named).id}`,
    );

    expect((roles.body as { items: unknown[] }).items).toHaveLength(4);
    expect(created.status).toBe(201);
    expect(renamedRole.body).toMatchObject({ name: 'Auditoría' });
    expect(duplicated.body).toMatchObject({
      code: IdentityErrorCode.AccessNameTaken,
    });
    expect(setRoles.status).toBe(204);
    expect(renamedGroup.body).toMatchObject({
      name: 'Auditores',
      roleIds: [roleId],
    });
    expect(deleteSystem.body).toMatchObject({
      code: IdentityErrorCode.AccessSystemRoleImmutable,
    });
    expect(editSystem.body).toMatchObject({
      code: IdentityErrorCode.AccessSystemRoleImmutable,
    });
    expect(ungrantable.status).toBe(403);
    expect(deleted.status).toBe(204);
  });

  it('keeps an admin from granting herself or others more than she has', async () => {
    const groups = (await owner.get('/v1/tenant/groups')).body as {
      items: Named[];
    };
    const roles = (await owner.get('/v1/tenant/roles')).body as {
      items: Named[];
    };
    const systemGroup = (role: TenantRole): string =>
      groups.items.find((g) => g.name === TenantAccessSetup.SYSTEM_NAMES[role])
        ?.id ?? '';
    const ownerRole =
      roles.items.find(
        (r) => r.name === TenantAccessSetup.SYSTEM_NAMES[TenantRole.Owner],
      )?.id ?? '';
    const ada = new IdentityJourney(app, 'ada.admin@example.com');
    await owner.post('/v1/tenant/invitations', {
      body: { email: ada.email, groupIds: [systemGroup(TenantRole.Admin)] },
    });
    await ada.signUp(
      ada.mailTo(IdentityEmailTemplate.TenantInvitation)['token'],
    );
    const session = await ada.signInWithEmailCode();
    const admin = ada.bearer(session.accessToken);
    const adaId = IdentityJourney.userIdFrom(session.accessToken);

    const selfPromotion = await admin.put(
      `/v1/tenant/members/${adaId}/groups`,
      {
        body: {
          groupIds: [
            systemGroup(TenantRole.Admin),
            systemGroup(TenantRole.Owner),
          ],
        },
      },
    );
    const demoteOwner = await admin.put(
      `/v1/tenant/members/${ownerId}/groups`,
      {
        body: { groupIds: [systemGroup(TenantRole.Member)] },
      },
    );
    const ownerRoleOnGroup = await admin.put(
      `/v1/tenant/groups/${auditGroupId}/roles`,
      { body: { roleIds: [ownerRole] } },
    );
    const ownerInvitation = await admin.post('/v1/tenant/invitations', {
      body: {
        email: 'otro.dueno@example.com',
        groupIds: [systemGroup(TenantRole.Owner)],
      },
    });
    const memberInvitation = await admin.post('/v1/tenant/invitations', {
      body: {
        email: 'otro.miembro@example.com',
        groupIds: [systemGroup(TenantRole.Member)],
      },
    });

    for (const denied of [
      selfPromotion,
      demoteOwner,
      ownerRoleOnGroup,
      ownerInvitation,
    ]) {
      expect(denied.status).toBe(403);
      expect(denied.body).toMatchObject({
        code: PlatformErrorCode.AuthForbidden,
      });
    }
    expect(memberInvitation.status).toBe(201);
  });

  it('invites a new person who signs up into the tenant with the invitation', async () => {
    const pia = new IdentityJourney(app, 'pia.invitada@example.com');
    const invited = await owner.post('/v1/tenant/invitations', {
      body: { email: pia.email, groupIds: [auditGroupId] },
    });
    const token = pia.mailTo(IdentityEmailTemplate.TenantInvitation)['token'];

    const signUp = await pia.signUp(token);
    const signIn = await pia.signIn();
    const members = await owner.get('/v1/tenant/members');
    const invitations = await owner.get('/v1/tenant/invitations');

    expect(invited.status).toBe(201);
    expect(signUp.status).toBe(202);
    expect(signIn.body).toMatchObject({ status: 'mfa_required' });
    expect((members.body as { items: Array<{ email: string }> }).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ email: pia.email })]),
    );
    expect((invitations.body as { items: unknown[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: pia.email, status: 'accepted' }),
      ]),
    );
  });

  it('lets an existing user accept an invitation with her session', async () => {
    const quique = new IdentityJourney(app, 'quique.existente@example.com');
    await quique.register();
    const session = await quique.signInWithEmailCode();
    await owner.post('/v1/tenant/invitations', {
      body: { email: quique.email, groupIds: [] },
    });
    const token = quique.mailTo(IdentityEmailTemplate.TenantInvitation)[
      'token'
    ];
    const revokable = await owner.post('/v1/tenant/invitations', {
      body: { email: 'nadie.mas@example.com', groupIds: [] },
    });

    const accepted = await quique
      .bearer(session.accessToken)
      .post('/v1/invitations/accept', { body: { token } });
    const again = await quique
      .bearer(session.accessToken)
      .post('/v1/invitations/accept', { body: { token } });
    const revoked = await owner.delete(
      `/v1/tenant/invitations/${(revokable.body as Named).id}`,
    );
    const quiqueId = IdentityJourney.userIdFrom(session.accessToken);
    const setGroups = await owner.put(`/v1/tenant/members/${quiqueId}/groups`, {
      body: { groupIds: [auditGroupId] },
    });
    const removed = await owner.delete(`/v1/tenant/members/${quiqueId}`);
    const lastOwner = await owner.delete(`/v1/tenant/members/${ownerId}`);

    expect(accepted.status).toBe(204);
    expect(again.body).toMatchObject({
      code: IdentityErrorCode.InvitationInvalid,
    });
    expect(revoked.status).toBe(204);
    expect(setGroups.status).toBe(204);
    expect(removed.status).toBe(204);
    expect(lastOwner.body).toMatchObject({
      code: IdentityErrorCode.AccessLastOwner,
    });
  });

  it('refuses to add a member when the plan of the tenant has no room for another user', async () => {
    const rita = new IdentityJourney(app, 'rita.sin.cupo@example.com');
    await rita.register();
    const session = await rita.signInWithEmailCode();
    await owner.post('/v1/tenant/invitations', {
      body: { email: rita.email, groupIds: [] },
    });
    const token = rita.mailTo(IdentityEmailTemplate.TenantInvitation)['token'];
    app.peers.limit(tenantId, UsageMetric.Users, { limit: 3, used: 3 });

    const refused = await rita
      .bearer(session.accessToken)
      .post('/v1/invitations/accept', { body: { token } });
    const members = await owner.get('/v1/tenant/members');

    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({
      code: BillingReference.QuotaExceeded,
    });
    expect(
      (members.body as { items: Array<{ email: string }> }).items,
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ email: rita.email })]),
    );
  });

  it('does not create the account of an invited person when the plan has no room for her', async () => {
    const tere = new IdentityJourney(app, 'tere.sin.cupo@example.com');
    await owner.post('/v1/tenant/invitations', {
      body: { email: tere.email, groupIds: [] },
    });
    const token = tere.mailTo(IdentityEmailTemplate.TenantInvitation)['token'];
    app.peers.limit(tenantId, UsageMetric.Users, { limit: 3, used: 3 });

    const refused = await tere.signUp(token);
    const signIn = await tere.signIn();
    const members = await owner.get('/v1/tenant/members');

    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({
      code: BillingReference.QuotaExceeded,
    });
    expect(signIn.body).toMatchObject({
      code: IdentityErrorCode.AuthInvalidCredentials,
    });
    expect(
      (members.body as { items: Array<{ email: string }> }).items,
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ email: tere.email })]),
    );
  });

  it('lets the invited person retry her sign up and join when another member took the last seat in between', async () => {
    const uma = new IdentityJourney(app, 'uma.reintento@example.com');
    await owner.post('/v1/tenant/invitations', {
      body: { email: uma.email, groupIds: [] },
    });
    const token = uma.mailTo(IdentityEmailTemplate.TenantInvitation)['token'];
    app.peers.fillAfter(tenantId, UsageMetric.Users, { limit: 3, used: 3 }, 1);

    const raced = await uma.signUp(token);
    app.peers.limit(tenantId, UsageMetric.Users, { limit: 5, used: 3 });
    let retried = raced;
    const giveUpAt = performance.now() + RETRY_DEADLINE_MS;
    while (retried.status === 403 && performance.now() < giveUpAt) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS));
      retried = await uma.signUp(token);
    }
    const signIn = await uma.signIn();
    const members = await owner.get('/v1/tenant/members');
    const invitations = await owner.get('/v1/tenant/invitations');

    expect(raced.status).toBe(403);
    expect(raced.body).toMatchObject({
      code: BillingReference.QuotaExceeded,
    });
    expect(retried.status).toBe(202);
    expect(
      app
        .mailer()
        .lastTo(uma.email, IdentityEmailTemplate.EmailAlreadyRegistered),
    ).toBeUndefined();
    expect(signIn.body).toMatchObject({ status: 'mfa_required' });
    expect((members.body as { items: Array<{ email: string }> }).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ email: uma.email })]),
    );
    expect((invitations.body as { items: unknown[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: uma.email, status: 'accepted' }),
      ]),
    );
  });

  it('answers that the email is taken when a member signs up again with a later invitation to her email', async () => {
    const vera = new IdentityJourney(app, 'vera.repetida@example.com');
    app.peers.limit(tenantId, UsageMetric.Users, { limit: 50, used: 3 });
    await owner.post('/v1/tenant/invitations', {
      body: { email: vera.email, groupIds: [] },
    });
    const joined = await vera.signUp(
      vera.mailTo(IdentityEmailTemplate.TenantInvitation)['token'],
    );
    await owner.post('/v1/tenant/invitations', {
      body: { email: vera.email, groupIds: [] },
    });
    const token = vera.mailTo(IdentityEmailTemplate.TenantInvitation)['token'];

    const again = await vera.signUp(token);

    expect(joined.status).toBe(202);
    expect(again.status).toBe(202);
    expect(
      app
        .mailer()
        .lastTo(vera.email, IdentityEmailTemplate.EmailAlreadyRegistered),
    ).toBeDefined();
  });

  it('creates service accounts and API keys that authenticate, rotate and revoke', async () => {
    const account = await owner.post('/v1/tenant/service-accounts', {
      body: {
        name: 'Integración',
        permissions: [Permission.IdentityMembersRead],
      },
    });
    const accountId = (account.body as Named).id;
    const ungrantable = await owner.post('/v1/tenant/service-accounts', {
      body: { name: 'Demasiado', permissions: [Permission.BackofficeAccess] },
    });
    const updated = await owner.patch(
      `/v1/tenant/service-accounts/${accountId}`,
      {
        body: { name: 'Integración ERP' },
      },
    );
    const created = await owner.post(
      `/v1/tenant/service-accounts/${accountId}/api-keys`,
      { body: { environment: 'live', allowedCidrs: ['203.0.113.0/24'] } },
    );
    const { secret, apiKey } = created.body as {
      secret: string;
      apiKey: Named;
    };

    const withKey = (ip: string): HttpTestClient =>
      app.client(ip).withHeaders({ Authorization: `Bearer ${secret}` });
    const fromInside = await withKey('203.0.113.9').get('/v1/tenant/members');
    const fromOutside = await withKey('198.51.100.9').get('/v1/tenant/members');
    const withoutIp = await app
      .internal()
      .invoke(AuthenticateApiKeyOperation, { apiKey: secret });
    const authenticated = await app
      .internal()
      .invoke(AuthenticateApiKeyOperation, {
        apiKey: secret,
        clientIp: '203.0.113.9',
      });
    const wrongIp = await app.internal().invoke(AuthenticateApiKeyOperation, {
      apiKey: secret,
      clientIp: '198.51.100.9',
    });
    const rotated = await owner.post(`/v1/tenant/api-keys/${apiKey.id}/rotate`);
    const graced = await app.internal().invoke(AuthenticateApiKeyOperation, {
      apiKey: secret,
      clientIp: '203.0.113.9',
    });
    const listed = await owner.get(
      `/v1/tenant/service-accounts/${accountId}/api-keys`,
    );
    const revoked = await owner.delete(`/v1/tenant/api-keys/${apiKey.id}`);
    const afterRevoke = await app
      .internal()
      .invoke(AuthenticateApiKeyOperation, { apiKey: secret });
    const disabled = await owner.delete(
      `/v1/tenant/service-accounts/${accountId}`,
    );
    const newSecret = (rotated.body as { secret: string }).secret;
    const afterDisable = await app
      .internal()
      .invoke(AuthenticateApiKeyOperation, { apiKey: newSecret });
    const accounts = await owner.get('/v1/tenant/service-accounts');

    expect(ungrantable.body).toMatchObject({
      code: IdentityErrorCode.ApiKeyPermissionNotGrantable,
    });
    expect(updated.body).toMatchObject({ name: 'Integración ERP' });
    expect(created.status).toBe(201);
    expect(secret).toMatch(/^sk_live_[A-Z2-7]{12}_[A-Za-z0-9]{48}$/);
    expect(authenticated).toMatchObject({
      kind: CallOutcomeKind.Success,
      value: { tenantId, permissions: [Permission.IdentityMembersRead] },
    });
    expect(wrongIp).toMatchObject({
      code: IdentityErrorCode.ApiKeyIpNotAllowed,
    });
    expect(withoutIp).toMatchObject({
      code: IdentityErrorCode.ApiKeyIpNotAllowed,
    });
    expect(fromInside.status).toBe(200);
    expect(fromOutside.status).toBe(401);
    expect(rotated.status).toBe(201);
    expect(graced).toMatchObject({ kind: CallOutcomeKind.Success });
    expect((listed.body as { items: unknown[] }).items).toHaveLength(2);
    expect(revoked.status).toBe(204);
    expect(afterRevoke).toMatchObject({
      code: IdentityErrorCode.ApiKeyInvalid,
    });
    expect(disabled.status).toBe(204);
    expect(afterDisable).toMatchObject({
      code: IdentityErrorCode.ApiKeyInvalid,
    });
    expect(accounts.body).toMatchObject({
      items: [expect.objectContaining({ status: 'disabled' })],
    });
  });

  it('suspends and reactivates the tenant and its users through the internal operations', async () => {
    const access = await app
      .internal()
      .invoke(GetUserAccessOperation, { userId: ownerId, tenantId });
    const managers = await app
      .internal()
      .invoke(ListMembersByPermissionOperation, {
        tenantId,
        permission: Permission.IdentityTenantManage,
        limit: 1,
      });
    const suspended = await app
      .internal()
      .invoke(SuspendTenantOperation, { tenantId });
    // Cada réplica guarda las épocas unos segundos en memoria: la suspensión se ve al vencer esa caché.
    await new Promise((resolve) =>
      setTimeout(resolve, AuthModuleRules.DEFAULT_CACHE_TTL_MS + 500),
    );
    const blocked = await owner.get('/v1/me/access');
    const reactivated = await app
      .internal()
      .invoke(ReactivateTenantOperation, { tenantId });
    const user = await app.internal().invoke(SuspendUserOperation, {
      userId: ownerId,
      reason: 'revisión',
    });
    const signIn = await olga.signIn();
    const back = await app
      .internal()
      .invoke(ReactivateUserOperation, { userId: ownerId });
    const revoked = await app.internal().invoke(RevokeUserSessionsOperation, {
      userId: ownerId,
      reason: 'admin_action',
    });
    const spare = TestIds.next();
    await app.internal().invoke(CreateTenantOperation, {
      tenantId: spare,
      slug: 'repuesto',
      name: 'Repuesto',
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: ownerId,
    });
    const discarded = await app
      .internal()
      .invoke(DiscardTenantOperation, { tenantId: spare });

    expect(access).toMatchObject({
      value: {
        permissions: expect.arrayContaining([Permission.IdentityTenantManage]),
      },
    });
    expect(managers).toMatchObject({
      value: { items: [{ userId: ownerId }], nextCursor: null },
    });
    expect(suspended).toMatchObject({ value: { status: 'suspended' } });
    expect(blocked.body).toMatchObject({
      code: IdentityErrorCode.TenantSuspended,
    });
    expect(reactivated).toMatchObject({ value: { status: 'active' } });
    expect(user).toMatchObject({ value: { status: 'suspended' } });
    expect(signIn.body).toMatchObject({
      code: IdentityErrorCode.UserSuspended,
    });
    expect(back).toMatchObject({ value: { status: 'active' } });
    expect(revoked).toMatchObject({ kind: CallOutcomeKind.Success });
    expect(discarded).toMatchObject({ value: { tenantId: spare } });
  });
});
