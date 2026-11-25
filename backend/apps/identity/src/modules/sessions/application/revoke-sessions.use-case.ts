import { Injectable } from '@nestjs/common';
import {
  RevocationReason,
  RevocationScope,
  TokensRevokedEvent,
} from '@contracts/identity';
import { AuthStateReader, AuthStateWriter } from '@platform/auth';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { UserRef } from '../../../shared/types/user-ref.type.js';
import { Session } from '../domain/session.js';
import { SessionRepository } from '../domain/session.repository.js';
import { SessionRevoker } from './session-revoker.js';

/** Which sessions of a user are revoked. */
export interface RevokeSessionsInput {
  readonly user: UserRef;
  readonly reason: RevocationReason;
  /** Session that is kept, for example the one that changes the password. */
  readonly except?: string;
  /** Only the sessions of this device. */
  readonly deviceId?: string;
  /** Only this session. */
  readonly sessionId?: string;
}

/**
 * Revokes sessions of a user in their shard. Revoking all of them, without exception or filter, also moves
 * the epoch of the user: so any access token the session mark does not reach falls too.
 */
@Injectable()
export class RevokeSessions {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly sessions: SessionRepository,
    private readonly revoker: SessionRevoker,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly reader: AuthStateReader,
    private readonly writer: AuthStateWriter,
    private readonly clock: Clock,
  ) {}

  /**
   * Revokes the selected sessions of a user.
   * @param input User, reason and filters.
   * @returns How many sessions it revoked.
   */
  async execute(input: RevokeSessionsInput): Promise<number> {
    const everything =
      input.except === undefined &&
      input.deviceId === undefined &&
      input.sessionId === undefined;
    const revoked = await this.scopes.inUserShard(input.user, () =>
      this.transactions.runInTransaction(async () => {
        const active = await this.sessions.listActive(input.user.userId);
        let count = 0;
        for (const session of active.filter((s) => this.selected(s, input))) {
          if (await this.revoker.revoke(session, input.reason)) {
            count += 1;
          }
        }
        if (everything) {
          await this.publishUserRevocation(input.user);
        }
        return count;
      }),
    );
    if (everything) {
      await this.moveUserEpoch(input.user.userId);
    }
    return revoked;
  }

  /**
   * Revokes every session of a user whose account is being erased and then deletes them, with the IPs and
   * user agents they keep. Repeating it changes nothing.
   * @param user User.
   */
  async forget(user: UserRef): Promise<void> {
    await this.execute({ user, reason: RevocationReason.AdminAction });
    await this.scopes.inUserShard(user, () =>
      this.sessions.forget(user.userId),
    );
  }

  private selected(session: Session, input: RevokeSessionsInput): boolean {
    const state = session.snapshot();
    return (
      state.id !== input.except &&
      (input.sessionId === undefined || state.id === input.sessionId) &&
      (input.deviceId === undefined || state.deviceId === input.deviceId)
    );
  }

  /**
   * The revocation of the whole user leaves with their home tenant in the envelope: consumers that require a
   * placed tenant (notifications closes its real-time connections) would reject it without one.
   */
  private async publishUserRevocation(user: UserRef): Promise<void> {
    await this.bus.publish(
      TokensRevokedEvent,
      {
        scope: RevocationScope.User,
        subjectId: user.userId,
        revokedBefore: this.clock.now().toISOString(),
      },
      { tenantId: user.homeTenantId },
    );
  }

  /** Keeps the current suspension: `users` writes it, and this epoch only moves the cut-off. */
  private async moveUserEpoch(userId: string): Promise<void> {
    const current = await this.reader.userEpoch(userId);
    await this.writer.setUserEpoch(userId, {
      revokedBefore: Math.floor(
        this.clock.now().getTime() / RevokeSessions.SECOND_MS,
      ),
      suspended: current?.suspended ?? false,
    });
  }
}
