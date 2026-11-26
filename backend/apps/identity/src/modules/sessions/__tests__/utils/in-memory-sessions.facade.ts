import type {
  AuthMethodReference,
  RevocationReason,
  SessionRevokedPayload,
  SessionTokens,
  TokensRevokedPayload,
} from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { SessionsFacade } from '../../application/sessions.facade.js';
import type { CreateSessionInput } from '../../domain/create-session-input.js';
import type { IssuedSession } from '../../domain/issued-session.js';
import type { SessionRef } from '../../domain/session-ref.js';

const ACCESS_TTL_MS = 600_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Sessions in memory with the call records the tests check. */
export class InMemorySessionsFacade extends SessionsFacade {
  readonly created: CreateSessionInput[] = [];
  readonly revokedForUser: Array<{
    ref: UserRef;
    reason: RevocationReason;
    except?: string;
  }> = [];
  readonly revokedForDevice: Array<{
    ref: UserRef;
    deviceId: string;
    reason: RevocationReason;
  }> = [];
  readonly verified: Array<{
    session: SessionRef;
    at: Date;
    amr: readonly AuthMethodReference[];
  }> = [];
  /** What `revokeUserSessions` and `revokeDeviceSessions` return. */
  revokeCount = 0;

  constructor(
    private readonly ids: IdGenerator = new SequentialIdGenerator(),
    private readonly clock: Clock = new FixedClock(),
  ) {
    super();
  }

  override async createSession(
    input: CreateSessionInput,
  ): Promise<IssuedSession> {
    this.created.push(input);
    const sessionId = this.ids.next().toString();
    const now = this.clock.now().getTime();
    return {
      sessionId,
      accessToken: `access-${sessionId}`,
      accessExpiresAt: new Date(now + ACCESS_TTL_MS),
      sessionToken: `st1_fake_${sessionId}`,
      sessionExpiresAt: new Date(now + SESSION_TTL_MS),
    };
  }

  override async revokeUserSessions(
    ref: UserRef,
    reason: RevocationReason,
    options?: { except?: string },
  ): Promise<number> {
    this.revokedForUser.push(
      options?.except === undefined
        ? { ref, reason }
        : { ref, reason, except: options.except },
    );
    return this.revokeCount;
  }

  override async revokeDeviceSessions(
    ref: UserRef,
    deviceId: string,
    reason: RevocationReason,
  ): Promise<number> {
    this.revokedForDevice.push({ ref, deviceId, reason });
    return this.revokeCount;
  }

  /** Last MFA of each session that `mfaVerifiedAt` returns. */
  readonly mfaTimes = new Map<string, Date>();

  override async mfaVerifiedAt(session: SessionRef): Promise<Date | undefined> {
    return this.mfaTimes.get(session.sessionId);
  }

  override async markMfaVerified(
    session: SessionRef,
    at: Date,
    amr: readonly AuthMethodReference[],
  ): Promise<SessionTokens> {
    this.verified.push({ session, at, amr });
    return {
      accessToken: `access-${session.sessionId}-mfa`,
      accessExpiresAt: new Date(at.getTime() + ACCESS_TTL_MS).toISOString(),
    };
  }

  readonly forgotten: UserRef[] = [];

  override async forget(ref: UserRef): Promise<void> {
    this.forgotten.push(ref);
  }

  readonly replayed: Array<SessionRevokedPayload | TokensRevokedPayload> = [];

  override async replaySessionRevocation(
    event: SessionRevokedPayload,
  ): Promise<void> {
    this.replayed.push(event);
  }

  override async replayUserRevocation(
    event: TokensRevokedPayload,
  ): Promise<void> {
    this.replayed.push(event);
  }
}
