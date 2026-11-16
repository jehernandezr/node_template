import type {
  AuthMethodReference,
  RevocationReason,
  SessionTokens,
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

/** Sesiones en memoria con los arreglos de llamadas que las pruebas revisan. */
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
  /** Lo que devuelven `revokeUserSessions` y `revokeDeviceSessions`. */
  revokeCount = 0;

  constructor(
    private readonly ids: IdGenerator = new SequentialIdGenerator(),
    private readonly clock: Clock = new FixedClock(),
  ) {
    super();
  }

  async createSession(input: CreateSessionInput): Promise<IssuedSession> {
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

  async revokeUserSessions(
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

  async revokeDeviceSessions(
    ref: UserRef,
    deviceId: string,
    reason: RevocationReason,
  ): Promise<number> {
    this.revokedForDevice.push({ ref, deviceId, reason });
    return this.revokeCount;
  }

  async markMfaVerified(
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
}
