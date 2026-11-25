import { Injectable } from '@nestjs/common';
import type {
  SessionRevokedPayload,
  TokensRevokedPayload,
} from '@contracts/identity';
import { AuthStateReader, AuthStateWriter } from '@platform/auth';
import { Clock } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SessionRevoker } from './session-revoker.js';

/**
 * Writes again into the shared auth state the revocations identity already published through its outbox.
 * The write right after the commit is the fast path; this replay is the one that survives a Valkey outage
 * or a crash between the commit and that write. Replaying is idempotent and never moves a cut-off back.
 */
@Injectable()
export class RevocationReplay {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly reader: AuthStateReader,
    private readonly writer: AuthStateWriter,
    private readonly settings: IdentitySettings,
    private readonly clock: Clock,
  ) {}

  /**
   * Marks a revoked session again for what is left of the life of its access tokens.
   * @param event Published revocation of the session.
   */
  async session(event: SessionRevokedPayload): Promise<void> {
    const elapsed = this.clock.now().getTime() - Date.parse(event.revokedAt);
    await this.writer.revokeSession(
      event.sessionId,
      this.settings.values.ACCESS_TOKEN_TTL +
        SessionRevoker.CLOCK_SKEW_MS -
        elapsed,
      event.reason,
    );
  }

  /**
   * Moves the epoch of a user up to the cut-off of a revocation of all their sessions, keeping their current
   * suspension and a later cut-off if there is one.
   * @param event Published revocation of the user.
   */
  async user(event: TokensRevokedPayload): Promise<void> {
    const current = await this.reader.userEpoch(event.subjectId);
    const cutOff = Math.floor(
      Date.parse(event.revokedBefore) / RevocationReplay.SECOND_MS,
    );
    if (current !== undefined && current.revokedBefore >= cutOff) {
      return;
    }
    await this.writer.setUserEpoch(event.subjectId, {
      revokedBefore: cutOff,
      suspended: current?.suspended ?? false,
    });
  }
}
