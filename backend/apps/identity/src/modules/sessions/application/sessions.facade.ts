import type {
  AuthMethodReference,
  RevocationReason,
  SessionRevokedPayload,
  SessionTokens,
  TokensRevokedPayload,
} from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { CreateSessionInput } from '../domain/create-session-input.js';
import type { IssuedSession } from '../domain/issued-session.js';
import type { SessionRef } from '../domain/session-ref.js';

/** What `sessions` offers to the other modules. */
export abstract class SessionsFacade {
  /**
   * Opens a session.
   * @param input User, device, methods, authentication time and client.
   * @returns The session and its tokens.
   */
  abstract createSession(input: CreateSessionInput): Promise<IssuedSession>;

  /**
   * Revokes the sessions of a user.
   * @param ref User.
   * @param reason Why they are revoked.
   * @param options Session to keep, if any.
   * @returns How many sessions it revoked.
   */
  abstract revokeUserSessions(
    ref: UserRef,
    reason: RevocationReason,
    options?: { except?: string },
  ): Promise<number>;

  /**
   * Revokes the sessions of a device of the user.
   * @param ref User.
   * @param deviceId Device.
   * @param reason Why they are revoked.
   * @returns How many sessions it revoked.
   */
  abstract revokeDeviceSessions(
    ref: UserRef,
    deviceId: string,
    reason: RevocationReason,
  ): Promise<number>;

  /**
   * Reads the instant of the last second factor of the session.
   * @param session Session.
   * @returns The instant, or `undefined` if it never asked for one or does not exist.
   */
  abstract mfaVerifiedAt(session: SessionRef): Promise<Date | undefined>;

  /**
   * Raises `mfaVerifiedAt`, `auth_time` and `amr` of the session and issues a new access token; the session
   * token does not change.
   * @param session Session.
   * @param at Instant of the second factor.
   * @param amr Methods just verified.
   * @returns The new tokens.
   */
  abstract markMfaVerified(
    session: SessionRef,
    at: Date,
    amr: readonly AuthMethodReference[],
  ): Promise<SessionTokens>;

  /**
   * Revokes every session of a user whose account is being erased and deletes them with their IPs and
   * user agents.
   * @param ref User.
   */
  abstract forget(ref: UserRef): Promise<void>;

  /**
   * Writes again into the shared auth state a published session revocation.
   * @param event Revocation of the session.
   */
  abstract replaySessionRevocation(event: SessionRevokedPayload): Promise<void>;

  /**
   * Writes again into the shared auth state a published revocation of every token of a user.
   * @param event Revocation of the user.
   */
  abstract replayUserRevocation(event: TokensRevokedPayload): Promise<void>;
}
