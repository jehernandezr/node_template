import {
  ActivateTenantOperation,
  CreateTenantOperation,
  IdentityErrorCode,
  IdentityEvent,
  IdentityRoute,
  MfaFactor,
  Permission,
  ReactivateTenantOperation,
  RevocationReason,
  RevocationScope,
  SignInStatus,
  SuspendTenantOperation,
  TenantKind,
  TenantRole,
} from '@contracts/identity';
import { BillingErrorCode, UsageMetric } from '@contracts/billing';
import { AuthModuleRules } from '@platform/auth/nest';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DispatchOutcome, MessageDispatcher } from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import type { HttpTestClient } from '@platform/http/test-utils';
import { IdentityEmailTemplate } from '../src/shared/enums/identity-email-template.enum.js';
import { TenantAccessSetup } from '../src/modules/access/application/tenant-access-setup.js';
import {
  AccessTokenClaimsReader,
  DeviceKey,
  Eventually,
  IdentityJourney,
  IdentityTestApp,
  SoftwareAuthenticator,
  TestIds,
  type SessionTokensBody,
} from '../src/__tests__/utils/index.js';

const runtime = new ContainerRuntime(process.env);

interface Named {
  readonly id: string;
  readonly name: string;
}

interface PendingBody {
  readonly status: SignInStatus;
  readonly mfa: { readonly mfaToken: string; readonly methods: MfaFactor[] };
}

interface OptionsBody {
  readonly challengeId: string;
  readonly optionsJson: string;
}

runtime.describeIfAvailable('identity security end to end', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();

  beforeAll(async () => {
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  const organizationOf = async (
    owner: IdentityJourney,
    session: SessionTokensBody,
    slug: string,
  ): Promise<{ tenantId: string; client: HttpTestClient }> => {
    const tenantId = TestIds.next();
    await app.internal().invoke(CreateTenantOperation, {
      tenantId,
      slug,
      name: slug,
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: IdentityJourney.userIdFrom(session.accessToken),
    });
    await app.internal().invoke(ActivateTenantOperation, { tenantId });
    return { tenantId, client: await switchTo(owner, session, tenantId) };
  };

  const switchTo = async (
    user: IdentityJourney,
    session: SessionTokensBody,
    tenantId: string,
  ): Promise<HttpTestClient> => {
    const switched = await user
      .bearer(session.accessToken)
      .post('/v1/me/tenant-switch', { body: { tenantId } });
    IdentityJourney.expectStatus(switched, 200);
    return user.bearer((switched.body as SessionTokensBody).accessToken);
  };

  const passkeyOptions = async (
    client: HttpTestClient,
    path: string,
    body?: object,
  ): Promise<OptionsBody> =>
    (await client.post(path, body === undefined ? undefined : { body }))
      .body as OptionsBody;

  describe('sign-in from a registered device', () => {
    const leo = new IdentityJourney(app, 'leo.device@example.com');
    let deviceId: string;

    beforeAll(async () => {
      await leo.register();
      deviceId = IdentityJourney.deviceIdFrom(
        (await leo.signInWithEmailCode()).accessToken,
      );
    });

    it('skips the second factor only with the signature of the device key', async () => {
      const signedIn = await leo.signInFromDevice(deviceId);

      expect(signedIn.body).toMatchObject({
        status: SignInStatus.Authenticated,
      });
    });

    it('asks for a second factor when the public device id comes signed by another key', async () => {
      const forged = await leo.native().post('/v1/auth/sign-in', {
        body: {
          email: leo.email,
          password: IdentityJourney.PASSWORD,
          device: new DeviceKey().signed(IdentityRoute.SignIn, deviceId, [
            leo.email,
          ]),
        },
      });

      expect(forged.body).toMatchObject({ status: SignInStatus.MfaRequired });
    });

    it('asks for a second factor when a device signature is replayed', async () => {
      const proof = leo.device.signed(IdentityRoute.SignIn, deviceId, [
        leo.email,
      ]);
      const body = {
        email: leo.email,
        password: IdentityJourney.PASSWORD,
        device: proof,
      };

      const first = await leo.native().post('/v1/auth/sign-in', { body });
      const replayed = await leo.native().post('/v1/auth/sign-in', { body });

      expect(first.body).toMatchObject({ status: SignInStatus.Authenticated });
      expect(replayed.body).toMatchObject({
        status: SignInStatus.MfaRequired,
      });
    });

    it('rejects the bare public device id the sign-in used to accept', async () => {
      const bare = await leo.native().post('/v1/auth/sign-in', {
        body: {
          email: leo.email,
          password: IdentityJourney.PASSWORD,
          deviceId,
        },
      });

      expect(bare.status).toBe(400);
    });
  });

  describe('a passkey without user verification', () => {
    const noe = new IdentityJourney(app, 'noe.passkey@example.com');
    const securityKey = new SoftwareAuthenticator(
      IdentityTestApp.WEB_ORIGIN,
      false,
    );
    let deviceId: string;

    beforeAll(async () => {
      await noe.register();
      const session = await noe.signInWithEmailCode();
      deviceId = IdentityJourney.deviceIdFrom(session.accessToken);
      const me = noe.bearer(session.accessToken);
      const options = await passkeyOptions(
        me,
        '/v1/me/passkeys/registration-options',
      );
      IdentityJourney.expectStatus(
        await me.post('/v1/me/passkeys', {
          body: {
            challengeId: options.challengeId,
            credentialJson: securityKey.create(options.optionsJson),
            name: 'Security key',
          },
        }),
        201,
      );
    });

    it('does not offer the same passkey as the second factor of its own sign-in', async () => {
      const options = await passkeyOptions(
        noe.native(),
        '/v1/auth/passkeys/options',
      );
      const signIn = await noe.native().post('/v1/auth/passkeys/verify', {
        body: {
          challengeId: options.challengeId,
          credentialJson: securityKey.get(options.optionsJson),
          device: noe.device.signed(
            IdentityRoute.PasskeySignInVerify,
            deviceId,
            [options.challengeId],
          ),
        },
      });
      const pending = signIn.body as PendingBody;
      const second = await noe.native().post('/v1/auth/mfa/passkey/options', {
        body: { mfaToken: pending.mfa.mfaToken },
      });

      expect(pending.status).toBe(SignInStatus.MfaRequired);
      expect(pending.mfa.methods).not.toContain(MfaFactor.Passkey);
      expect(second.body).toMatchObject({
        code: IdentityErrorCode.MfaMethodUnavailable,
      });
    });

    it('does not count as the second factor of a password sign-in', async () => {
      const signIn = await noe.signIn();
      const pending = signIn.body as PendingBody;
      const options = await passkeyOptions(
        noe.native(),
        '/v1/auth/mfa/passkey/options',
        { mfaToken: pending.mfa.mfaToken },
      );

      const verified = await noe.native().post('/v1/auth/mfa/passkey/verify', {
        body: {
          mfaToken: pending.mfa.mfaToken,
          challengeId: options.challengeId,
          credentialJson: securityKey.get(options.optionsJson),
        },
      });

      expect(pending.mfa.methods).toContain(MfaFactor.Passkey);
      expect(verified.body).toMatchObject({
        code: IdentityErrorCode.PasskeyVerificationFailed,
      });
    });
  });

  describe('API keys of a service account', () => {
    const owen = new IdentityJourney(app, 'owen.owner@example.com');
    const kim = new IdentityJourney(app, 'kim.keys@example.com');
    let owner: HttpTestClient;
    let keyManager: HttpTestClient;
    let accountId: string;

    beforeAll(async () => {
      await owen.register();
      const organization = await organizationOf(
        owen,
        await owen.signInWithEmailCode(),
        'keys',
      );
      owner = organization.client;
      const role = await owner.post('/v1/tenant/roles', {
        body: {
          name: 'Key managers',
          permissions: [Permission.IdentityApiKeysManage],
        },
      });
      const group = await owner.post('/v1/tenant/groups', {
        body: { name: 'Key managers' },
      });
      await owner.put(`/v1/tenant/groups/${(group.body as Named).id}/roles`, {
        body: { roleIds: [(role.body as Named).id] },
      });
      const account = await owner.post('/v1/tenant/service-accounts', {
        body: {
          name: 'Reader',
          permissions: [
            Permission.BillingWrite,
            Permission.IdentityMembersRead,
          ],
        },
      });
      accountId = (account.body as Named).id;
      await owner.post('/v1/tenant/invitations', {
        body: { email: kim.email, groupIds: [(group.body as Named).id] },
      });
      await kim.signUp(
        kim.mailTo(IdentityEmailTemplate.TenantInvitation)['token'],
      );
      keyManager = await switchTo(
        kim,
        await kim.signInWithEmailCode(),
        organization.tenantId,
      );
    });

    it('refuses a key for an account with permissions its creator lacks', async () => {
      const created = await keyManager.post(
        `/v1/tenant/service-accounts/${accountId}/api-keys`,
        { body: { environment: 'live' } },
      );

      expect(created.status).toBe(403);
      expect(created.body).toMatchObject({
        code: IdentityErrorCode.ApiKeyPermissionNotGrantable,
      });
    });

    it('refuses to rotate a key of an account with permissions the caller lacks', async () => {
      const issued = await owner.post(
        `/v1/tenant/service-accounts/${accountId}/api-keys`,
        { body: { environment: 'live' } },
      );
      const apiKeyId = (issued.body as { apiKey: Named }).apiKey.id;

      const rotated = await keyManager.post(
        `/v1/tenant/api-keys/${apiKeyId}/rotate`,
      );

      expect(issued.status).toBe(201);
      expect(rotated.body).toMatchObject({
        code: IdentityErrorCode.ApiKeyPermissionNotGrantable,
      });
    });
  });

  describe('a member who is removed and invited again', () => {
    const ona = new IdentityJourney(app, 'ona.owner@example.com');
    const mia = new IdentityJourney(app, 'mia.member@example.com');
    let owner: HttpTestClient;
    let tenantId: string;
    let miaSession: SessionTokensBody;

    const inviteAndAccept = async (): Promise<void> => {
      await owner.post('/v1/tenant/invitations', {
        body: { email: mia.email, groupIds: [] },
      });
      const accepted = await mia
        .bearer(miaSession.accessToken)
        .post('/v1/invitations/accept', {
          body: {
            token: mia.mailTo(IdentityEmailTemplate.TenantInvitation)['token'],
          },
        });
      IdentityJourney.expectStatus(accepted, 204);
    };

    beforeAll(async () => {
      await ona.register();
      const organization = await organizationOf(
        ona,
        await ona.signInWithEmailCode(),
        'comeback',
      );
      owner = organization.client;
      tenantId = organization.tenantId;
      const group = await owner.post('/v1/tenant/groups', {
        body: { name: 'Readers' },
      });
      IdentityJourney.expectStatus(
        await owner.put(`/v1/tenant/groups/${(group.body as Named).id}/roles`, {
          body: { roleIds: [] },
        }),
        204,
      );
      await mia.register();
      miaSession = await mia.signInWithEmailCode();
    });

    it('works in the tenant again with a token issued after the new invitation', async () => {
      await inviteAndAccept();
      await switchTo(mia, miaSession, tenantId);
      const userId = IdentityJourney.userIdFrom(miaSession.accessToken);
      IdentityJourney.expectStatus(
        await owner.delete(`/v1/tenant/members/${userId}`),
        204,
      );
      await inviteAndAccept();

      const again = await switchTo(mia, miaSession, tenantId);
      const access = await again.get('/v1/me/access');

      expect(access.status).toBe(200);
      expect(access.body).toMatchObject({ tenantId });
    });
  });

  describe('session refresh', () => {
    const rosa = new IdentityJourney(app, 'rosa.refresh@example.com');
    let deviceId: string;

    const refresh = (sessionToken: string) =>
      rosa.native().post('/v1/auth/refresh', { body: { sessionToken } });

    beforeAll(async () => {
      await rosa.register();
      deviceId = IdentityJourney.deviceIdFrom(
        (await rosa.signInWithEmailCode()).accessToken,
      );
    });

    it('keeps the session token usable when the refresh is refused before rotating', async () => {
      const signedIn = await rosa.signInFromDevice(deviceId);
      const session = (signedIn.body as { tokens: SessionTokensBody }).tokens;
      const { tenantId } = await organizationOf(rosa, session, 'refresh');
      await app.internal().invoke(SuspendTenantOperation, { tenantId });
      const refused = await refresh(session.sessionToken);
      await app.internal().invoke(ReactivateTenantOperation, { tenantId });

      const again = await refresh(session.sessionToken);

      expect(refused.body).toMatchObject({
        code: IdentityErrorCode.TenantSuspended,
      });
      expect(again.status).toBe(200);
      expect((again.body as SessionTokensBody).sessionToken).toEqual(
        expect.any(String),
      );
    });

    it('hands the current session token to a retry within the grace', async () => {
      const signedIn = await rosa.signInFromDevice(deviceId);
      const session = (signedIn.body as { tokens: SessionTokensBody }).tokens;
      const first = await refresh(session.sessionToken);

      const retry = await refresh(session.sessionToken);

      expect(retry.status).toBe(200);
      expect((retry.body as SessionTokensBody).sessionToken).toBe(
        (first.body as SessionTokensBody).sessionToken,
      );
    });
  });

  describe('a recovery without a device', () => {
    const tom = new IdentityJourney(app, 'tom.recovery@example.com');
    let deviceId: string;

    const pendingToken = async (): Promise<string> =>
      ((await tom.signIn()).body as PendingBody).mfa.mfaToken;

    beforeAll(async () => {
      await tom.register();
      deviceId = IdentityJourney.deviceIdFrom(
        (await tom.signInWithEmailCode()).accessToken,
      );
    });

    it('is cancelled once the user proves a second factor', async () => {
      await tom.native().post('/v1/auth/mfa/recoveries', {
        body: { mfaToken: await pendingToken() },
      });
      const token = tom.mailTo(IdentityEmailTemplate.MfaRecoveryLink)['token'];
      const mfaToken = await pendingToken();
      const challenge = await tom.native().post('/v1/auth/mfa/challenges', {
        body: { mfaToken, method: MfaFactor.DeviceOtp },
      });
      const challengeId = (challenge.body as { challengeId: string })
        .challengeId;
      IdentityJourney.expectStatus(
        await tom.native().post('/v1/auth/mfa/verify', {
          body: {
            mfaToken,
            challengeId,
            code: await tom.approvalCode(deviceId, challengeId),
          },
        }),
        200,
      );

      const confirmed = await tom
        .native()
        .post('/v1/auth/mfa/recoveries/confirm', {
          body: { mfaToken: await pendingToken(), token },
        });

      expect(confirmed.body).toMatchObject({
        code: IdentityErrorCode.MfaTokenInvalid,
      });
    });
  });

  describe('wrong second-factor codes', () => {
    const uma = new IdentityJourney(app, 'uma.guesses@example.com');
    const WRONG = 'WRONG0';

    const emailChallenge = async (mfaToken: string): Promise<string> => {
      const challenge = await uma.native().post('/v1/auth/mfa/challenges', {
        body: { mfaToken, method: MfaFactor.EmailOtp },
      });
      return (challenge.body as { challengeId: string }).challengeId;
    };

    const guess = (mfaToken: string, challengeId: string, code: string) =>
      uma.native().post('/v1/auth/mfa/verify', {
        body: { mfaToken, challengeId, code },
      });

    beforeAll(async () => {
      await uma.register();
    });

    it('stop counting per challenge and block the user after ten across challenges', async () => {
      const mfaToken = ((await uma.signIn()).body as PendingBody).mfa.mfaToken;
      const first = await emailChallenge(mfaToken);
      await Promise.all(
        [1, 2, 3, 4, 5].map(() => guess(mfaToken, first, WRONG)),
      );
      uma.moveTo('198.51.100.77');
      const second = await emailChallenge(mfaToken);
      await Promise.all(
        [1, 2, 3, 4, 5].map(() => guess(mfaToken, second, WRONG)),
      );
      const third = await emailChallenge(mfaToken);

      const right = await guess(
        mfaToken,
        third,
        uma.mailTo(IdentityEmailTemplate.MfaCode)['code'] ?? '',
      );

      expect(right.body).toMatchObject({
        code: IdentityErrorCode.MfaTooManyAttempts,
      });
      expect(right.headers.get('retry-after')).toEqual(expect.any(String));
    });
  });

  describe('invitations', () => {
    const iris = new IdentityJourney(app, 'iris.owner@example.com');
    let owner: HttpTestClient;
    let tenantId: string;
    let systemGroup: (role: TenantRole) => string;

    const invitationTokenOf = (user: IdentityJourney): string =>
      user.mailTo(IdentityEmailTemplate.TenantInvitation)['token'] ?? '';

    const registered = async (
      user: IdentityJourney,
    ): Promise<HttpTestClient> => {
      await user.register();
      return user.bearer((await user.signInWithEmailCode()).accessToken);
    };

    beforeAll(async () => {
      await iris.register();
      const organization = await organizationOf(
        iris,
        await iris.signInWithEmailCode(),
        'invites',
      );
      owner = organization.client;
      tenantId = organization.tenantId;
      const groups = (await owner.get('/v1/tenant/groups')).body as {
        items: Named[];
      };
      systemGroup = (role) =>
        groups.items.find(
          (group) => group.name === TenantAccessSetup.SYSTEM_NAMES[role],
        )?.id ?? '';
    });

    it('are refused once their inviter can no longer grant their groups', async () => {
      const ada = new IdentityJourney(app, 'ada.inviter@example.com');
      const xia = new IdentityJourney(app, 'xia.invited@example.com');
      const xiaClient = await registered(xia);
      await owner.post('/v1/tenant/invitations', {
        body: { email: ada.email, groupIds: [systemGroup(TenantRole.Admin)] },
      });
      await ada.signUp(invitationTokenOf(ada));
      const adaSession = await ada.signInWithEmailCode();
      const admin = await switchTo(ada, adaSession, tenantId);
      IdentityJourney.expectStatus(
        await admin.post('/v1/tenant/invitations', {
          body: {
            email: xia.email,
            groupIds: [systemGroup(TenantRole.Member)],
          },
        }),
        201,
      );
      IdentityJourney.expectStatus(
        await owner.delete(
          `/v1/tenant/members/${IdentityJourney.userIdFrom(adaSession.accessToken)}`,
        ),
        204,
      );

      const accepted = await xiaClient.post('/v1/invitations/accept', {
        body: { token: invitationTokenOf(xia) },
      });

      expect(accepted.body).toMatchObject({
        code: IdentityErrorCode.InvitationInvalid,
      });
    });

    it('never fill more seats than the plan has when accepted at once', async () => {
      const guests = ['pau', 'quim', 'rut'].map(
        (name) => new IdentityJourney(app, `${name}.seat@example.com`),
      );
      const clients = await Promise.all(
        guests.map((guest) => registered(guest)),
      );
      const members = (
        (await owner.get('/v1/tenant/members')).body as { items: unknown[] }
      ).items.length;
      app.peers.limit(tenantId, UsageMetric.Users, {
        limit: members + 2,
        used: members,
      });
      await Promise.all(
        guests.map((guest) =>
          owner.post('/v1/tenant/invitations', {
            body: { email: guest.email, groupIds: [] },
          }),
        ),
      );
      const tokens = guests.map((guest) => invitationTokenOf(guest));

      const accepted = await Promise.all(
        clients.map((client, index) =>
          client.post('/v1/invitations/accept', {
            body: { token: tokens[index] },
          }),
        ),
      );
      const after = (
        (await owner.get('/v1/tenant/members')).body as { items: unknown[] }
      ).items.length;

      expect(accepted.map((response) => response.status).sort()).toEqual([
        204, 204, 403,
      ]);
      expect(accepted.map((response) => response.body)).toContainEqual(
        expect.objectContaining({ code: BillingErrorCode.QuotaExceeded }),
      );
      expect(after).toBe(members + 2);
    });
  });

  describe('replay of the shared auth state', () => {
    const zoe = new IdentityJourney(app, 'zoe.replay@example.com');
    let deviceId: string;

    const deliver = (type: IdentityEvent, tenantId: string, data: object) =>
      app.get(MessageDispatcher).dispatch(
        EnvelopeBuilder.anEnvelope({
          id: TestIds.next(),
          type,
          source: 'identity',
          tenantid: tenantId,
          data,
        }),
        { receiveCount: 1 },
      );

    const freshSession = async (): Promise<SessionTokensBody> =>
      (
        (await zoe.signInFromDevice(deviceId)).body as {
          tokens: SessionTokensBody;
        }
      ).tokens;

    beforeAll(async () => {
      await zoe.register();
      deviceId = IdentityJourney.deviceIdFrom(
        (await zoe.signInWithEmailCode()).accessToken,
      );
    });

    it('rejects the access token of a session whose revocation only reached the outbox', async () => {
      const session = await freshSession();
      const claims = AccessTokenClaimsReader.read(session.accessToken);
      const delivered = await deliver(
        IdentityEvent.SessionRevoked,
        String(claims['htid']),
        {
          sessionId: String(claims['sid']),
          userId: String(claims['sub']),
          tenantId: String(claims['tid']),
          reason: RevocationReason.Compromised,
          revokedAt: new Date().toISOString(),
        },
      );

      const access = await zoe.bearer(session.accessToken).get('/v1/me/access');

      expect(delivered.outcome).toBe(DispatchOutcome.Processed);
      expect(access.body).toMatchObject({
        code: IdentityErrorCode.SessionRevoked,
      });
    });

    it('rejects every older token of a user whose revocation only reached the outbox', async () => {
      const yan = new IdentityJourney(app, 'yan.replay@example.com');
      await yan.register();
      const session = await yan.signInWithEmailCode();
      const claims = AccessTokenClaimsReader.read(session.accessToken);
      await deliver(IdentityEvent.TokensRevoked, String(claims['htid']), {
        scope: RevocationScope.User,
        subjectId: String(claims['sub']),
        revokedBefore: new Date(Date.now() + 2_000).toISOString(),
      });

      const rejected = Eventually.until(
        async () =>
          (await yan.bearer(session.accessToken).get('/v1/me/access'))
            .status === 401,
        AuthModuleRules.DEFAULT_CACHE_TTL_MS + 2_000,
      );

      await expect(rejected).resolves.toBeUndefined();
    });
  });

  describe('account deletion', () => {
    it('is refused to the last owner of a tenant with other members', async () => {
      const vera = new IdentityJourney(app, 'vera.owner@example.com');
      const walt = new IdentityJourney(app, 'walt.member@example.com');
      await vera.register();
      const veraSession = await vera.signInWithEmailCode();
      const organization = await organizationOf(
        vera,
        veraSession,
        'inheritance',
      );
      await walt.register();
      const waltSession = await walt.signInWithEmailCode();
      await organization.client.post('/v1/tenant/invitations', {
        body: { email: walt.email, groupIds: [] },
      });
      IdentityJourney.expectStatus(
        await walt
          .bearer(waltSession.accessToken)
          .post('/v1/invitations/accept', {
            body: {
              token: walt.mailTo(IdentityEmailTemplate.TenantInvitation)[
                'token'
              ],
            },
          }),
        204,
      );

      const deletion = await vera
        .bearer(veraSession.accessToken)
        .post('/v1/me/deletion');

      expect(deletion.body).toMatchObject({
        code: IdentityErrorCode.AccessLastOwner,
      });
    });
  });
});
