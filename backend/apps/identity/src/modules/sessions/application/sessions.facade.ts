import type {
  AuthMethodReference,
  RevocationReason,
  SessionTokens,
} from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { CreateSessionInput } from '../domain/create-session-input.js';
import type { IssuedSession } from '../domain/issued-session.js';
import type { SessionRef } from '../domain/session-ref.js';

/** Lo que `sessions` ofrece a los otros módulos. */
export abstract class SessionsFacade {
  abstract createSession(input: CreateSessionInput): Promise<IssuedSession>;
  /** Devuelve cuántas sesiones revocó. */
  abstract revokeUserSessions(
    ref: UserRef,
    reason: RevocationReason,
    options?: { except?: string },
  ): Promise<number>;
  abstract revokeDeviceSessions(
    ref: UserRef,
    deviceId: string,
    reason: RevocationReason,
  ): Promise<number>;
  /** Sube `mfaVerifiedAt`, `auth_time` y `amr` de la sesión y emite un access token nuevo; el session token no cambia. */
  /** Instante del último segundo factor de la sesión, o `undefined` si nunca lo pidió o no existe. */
  abstract mfaVerifiedAt(session: SessionRef): Promise<Date | undefined>;
  abstract markMfaVerified(
    session: SessionRef,
    at: Date,
    amr: readonly AuthMethodReference[],
  ): Promise<SessionTokens>;
}
