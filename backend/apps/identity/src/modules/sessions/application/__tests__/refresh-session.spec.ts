import {
  AuthMethodReference,
  ClientPlatform,
  IdentityErrorCode,
  SessionRevokedEvent,
  TenantKind,
  TenantLifecycle,
  UserStatus,
} from '@contracts/identity';
import { InMemoryAuthState } from '@platform/auth/test-utils';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
} from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { StaticAppConfig } from '../../../../__tests__/utils/index.js';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import { InMemoryTenantsFacade } from '../../../tenants/__tests__/utils/index.js';
import { InMemoryTokensFacade } from '../../../tokens/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { InMemorySessionRepository } from '../../__tests__/utils/index.js';
import { Session } from '../../domain/session.js';
import { RefreshSession } from '../refresh-session.use-case.js';
import { SessionRevoker } from '../session-revoker.js';
import { SessionTokenIssuer } from '../session-token-issuer.js';

const ANA = {
  userId: '01941f29-7c00-7000-8000-000000000021',
  homeTenantId: '01941f29-7c00-7000-8000-000000000022',
};
const SESSION = '01941f29-7c00-7000-8000-000000000031';
const START = new Date('2026-11-16T10:00:00.000Z');
const DAY_MS = 86_400_000;

class RefreshHarness {
  readonly clock = new FixedClock(START);
  readonly transactions = new InMemoryTransactionManager();
  readonly sessions = new InMemorySessionRepository(this.transactions);
  readonly bus = new RecordingMessageBus(this.transactions);
  readonly users = new InMemoryUsersFacade();
  readonly tenants = new InMemoryTenantsFacade().add({
    id: ANA.homeTenantId,
    slug: 'acme',
    name: 'Acme',
    region: 'us-east-1',
    kind: TenantKind.Organization,
    status: TenantLifecycle.Active,
  });
  readonly issuer = new SessionTokenIssuer(
    new InMemoryTokensFacade(),
    new SecretGenerator(new SystemRandomSource()),
    new HmacSecretHasher(['test', 'secret', 'key'].join('-')),
  );
  private readonly settings = new IdentitySettings(new StaticAppConfig({}));
  readonly refresh = new RefreshSession(
    this.sessions,
    this.issuer,
    new SessionRevoker(
      this.sessions,
      new InMemoryAuthState(),
      this.bus,
      this.transactions,
      this.clock,
      this.settings,
    ),
    this.users,
    this.tenants,
    UnroutedShardScopes.create(),
    this.transactions,
    this.clock,
    this.settings,
  );

  async signedIn(status = UserStatus.Active): Promise<string> {
    this.users.add({
      id: ANA.userId,
      homeTenantId: ANA.homeTenantId,
      email: 'ana@example.com',
      status,
      displayName: 'Ana',
      locale: 'es',
    });
    const session = Session.open({
      id: SESSION,
      userId: ANA.userId,
      homeTenantId: ANA.homeTenantId,
      activeTenantId: ANA.homeTenantId,
      deviceName: 'web',
      platform: ClientPlatform.Web,
      tokenSalt: this.issuer.newSalt(),
      generation: Session.FIRST_GENERATION,
      amr: [AuthMethodReference.Password],
      authTime: START,
      idleExpiresAt: new Date(START.getTime() + DAY_MS),
      absoluteExpiresAt: new Date(START.getTime() + 30 * DAY_MS),
      lastRefreshAt: START,
      ip: '203.0.113.5',
    });
    await this.sessions.insert(session);
    return this.issuer.sessionToken(session);
  }

  async stored(): Promise<Session | undefined> {
    return this.sessions.find(ANA.userId, SESSION);
  }
}

describe('RefreshSession', () => {
  it('rotates the session token and issues a new access token', async () => {
    const harness = new RefreshHarness();
    const token = await harness.signedIn();

    const refreshed = await harness.refresh.execute(token);

    expect(refreshed.accessToken).toEqual(expect.any(String));
    expect(refreshed.sessionToken).not.toBe(token);
    expect((await harness.stored())?.snapshot().generation).toBe(
      Session.FIRST_GENERATION + 1,
    );
  });

  it('gives two tabs that refresh at the same time the same new token instead of revoking the session', async () => {
    const harness = new RefreshHarness();
    const token = await harness.signedIn();

    const [first, second] = await Promise.all([
      harness.refresh.execute(token),
      harness.refresh.execute(token),
    ]);

    expect(first.sessionToken).toBe(second.sessionToken);
    expect((await harness.stored())?.snapshot().generation).toBe(
      Session.FIRST_GENERATION + 1,
    );
    expect((await harness.stored())?.isRevoked()).toBe(false);
  });

  it('revokes the session as stolen when a rotated token comes back after the grace', async () => {
    const harness = new RefreshHarness();
    const token = await harness.signedIn();
    await harness.refresh.execute(token);
    harness.clock.advance(60_000);

    await expect(harness.refresh.execute(token)).rejects.toMatchObject({
      code: IdentityErrorCode.SessionReused,
    });
    expect((await harness.stored())?.isRevoked()).toBe(true);
    expect(harness.bus.types()).toContain(SessionRevokedEvent.type);
  });

  it('refuses a session past its idle expiry', async () => {
    const harness = new RefreshHarness();
    const token = await harness.signedIn();
    harness.clock.advance(DAY_MS + 1);

    await expect(harness.refresh.execute(token)).rejects.toMatchObject({
      code: IdentityErrorCode.SessionExpired,
    });
  });

  it('refuses the session of a suspended user without rotating it', async () => {
    const harness = new RefreshHarness();
    const token = await harness.signedIn(UserStatus.Suspended);

    await expect(harness.refresh.execute(token)).rejects.toMatchObject({
      code: IdentityErrorCode.UserSuspended,
    });
    expect((await harness.stored())?.snapshot().generation).toBe(
      Session.FIRST_GENERATION,
    );
  });

  it('answers a forged secret as an unknown token and leaves the session alone', async () => {
    const harness = new RefreshHarness();
    const token = await harness.signedIn();
    const forged = `${token.slice(0, -4)}AAAA`;

    await expect(harness.refresh.execute(forged)).rejects.toMatchObject({
      code: 'PLATFORM.AUTH.UNAUTHENTICATED',
    });
    expect((await harness.stored())?.isRevoked()).toBe(false);
  });

  it('refuses a missing token', async () => {
    const harness = new RefreshHarness();

    await expect(harness.refresh.execute(undefined)).rejects.toMatchObject({
      code: 'PLATFORM.AUTH.UNAUTHENTICATED',
    });
  });
});
