import type { Session } from './session.js';

/** Sessions of a user, in the user shard. The use case opens the `ShardScope`. */
export abstract class SessionRepository {
  /**
   * Inserts a new session.
   * @param session Session to insert.
   */
  abstract insert(session: Session): Promise<void>;

  /**
   * Reads a session even if it is revoked or expired.
   * @param userId Owner.
   * @param sessionId Session.
   * @returns The session, or `undefined` if it does not exist or belongs to another user.
   */
  abstract find(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined>;

  /**
   * Like `find`, but locks the row until the open transaction ends: two concurrent refreshes of the same
   * token are served one after the other, and the second sees the generation the first left.
   * @param userId Owner.
   * @param sessionId Session.
   * @returns The session, or `undefined`.
   */
  abstract findForUpdate(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined>;

  /**
   * Lists the sessions of the user that are not revoked, the most recent first.
   * @param userId Owner.
   * @returns The active sessions.
   */
  abstract listActive(userId: string): Promise<readonly Session[]>;

  /**
   * Updates a session with optimistic locking.
   * @param session Changed session.
   * @throws OptimisticLockError if another write changed the session.
   */
  abstract update(session: Session): Promise<void>;

  /**
   * Deletes every session of a user whose account is being erased, with the IPs and user agents they keep.
   * @param userId Owner.
   */
  abstract forget(userId: string): Promise<void>;
}
