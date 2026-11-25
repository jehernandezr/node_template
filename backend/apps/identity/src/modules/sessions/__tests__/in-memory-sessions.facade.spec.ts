import { AuthMethodReference, RevocationReason } from '@contracts/identity';
import { ClientChannel } from '@platform/http';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemorySessionsFacade } from './utils/index.js';

const ANA = {
  userId: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: 't',
};
const START = new Date('2026-11-16T10:00:00.000Z');
const TEN_MINUTES = 600_000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

describe('InMemorySessionsFacade', () => {
  it('creates a session with access and session tokens from the clock', async () => {
    const clock = new FixedClock(START);
    const facade = new InMemorySessionsFacade(
      new SequentialIdGenerator(),
      clock,
    );

    const issued = await facade.createSession({
      user: ANA,
      authMethods: [AuthMethodReference.Password],
      authTime: START,
      client: { ip: '203.0.113.5', channel: ClientChannel.Web },
    });

    expect(issued.sessionId).toBe('01941f29-7c00-7000-8000-000000000001');
    expect(issued.accessToken).toBe(`access-${issued.sessionId}`);
    expect(issued.accessExpiresAt.getTime()).toBe(
      START.getTime() + TEN_MINUTES,
    );
    expect(issued.sessionToken).toBe(`st1_fake_${issued.sessionId}`);
    expect(issued.sessionExpiresAt.getTime()).toBe(
      START.getTime() + THIRTY_DAYS,
    );
    expect(facade.created).toHaveLength(1);
  });

  it('records user revocations with and without an exception', async () => {
    const facade = new InMemorySessionsFacade();
    facade.revokeCount = 3;

    await expect(
      facade.revokeUserSessions(ANA, RevocationReason.PasswordChanged),
    ).resolves.toBe(3);
    await expect(
      facade.revokeUserSessions(ANA, RevocationReason.UserAction, {
        except: 'session-current',
      }),
    ).resolves.toBe(3);

    expect(facade.revokedForUser).toEqual([
      { ref: ANA, reason: RevocationReason.PasswordChanged },
      {
        ref: ANA,
        reason: RevocationReason.UserAction,
        except: 'session-current',
      },
    ]);
  });

  it('records device revocations', async () => {
    const facade = new InMemorySessionsFacade();

    await expect(
      facade.revokeDeviceSessions(ANA, 'dv1_x', RevocationReason.Compromised),
    ).resolves.toBe(0);

    expect(facade.revokedForDevice).toEqual([
      { ref: ANA, deviceId: 'dv1_x', reason: RevocationReason.Compromised },
    ]);
  });

  it('raises the token expiry from the time of the MFA verification', async () => {
    const facade = new InMemorySessionsFacade();
    const session = {
      sessionId: 'session-1',
      userId: ANA.userId,
      homeTenantId: ANA.homeTenantId,
    };
    const at = new Date('2026-11-16T10:30:00.000Z');

    const tokens = await facade.markMfaVerified(session, at, [
      AuthMethodReference.EmailOtp,
    ]);

    expect(tokens).toEqual({
      accessToken: 'access-session-1-mfa',
      accessExpiresAt: new Date(at.getTime() + TEN_MINUTES).toISOString(),
    });
    expect(facade.verified[0]?.amr).toEqual([AuthMethodReference.EmailOtp]);
  });
});
