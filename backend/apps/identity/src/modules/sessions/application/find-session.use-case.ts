import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { SessionState } from '../domain/session.js';
import { SessionRef } from '../domain/session-ref.js';
import { SessionRepository } from '../domain/session.repository.js';

/** Reads a session, for example to return its last MFA. */
@Injectable()
export class FindSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Reads a session by its reference.
   * @param ref User and session.
   * @returns The session state, or `undefined`.
   */
  async execute(ref: SessionRef): Promise<SessionState | undefined> {
    const session = await this.scopes.inUserShard(ref, () =>
      this.sessions.find(ref.userId, ref.sessionId),
    );
    return session?.snapshot();
  }
}
