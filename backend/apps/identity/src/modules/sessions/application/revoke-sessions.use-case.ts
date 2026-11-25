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

/** Qué sesiones de un usuario se revocan. */
export interface RevokeSessionsInput {
  readonly user: UserRef;
  readonly reason: RevocationReason;
  /** Sesión que se conserva, por ejemplo la que cambia la contraseña. */
  readonly except?: string;
  /** Solo las sesiones de este dispositivo. */
  readonly deviceId?: string;
  /** Solo esta sesión. */
  readonly sessionId?: string;
}

/**
 * Revoca sesiones de un usuario en su shard. Revocar todas, sin excepción ni filtro, además mueve la época
 * del usuario: así cae también cualquier access token que la marca de sesión no alcance.
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

  /** Devuelve cuántas sesiones revocó. */
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

  private selected(session: Session, input: RevokeSessionsInput): boolean {
    const state = session.snapshot();
    return (
      state.id !== input.except &&
      (input.sessionId === undefined || state.id === input.sessionId) &&
      (input.deviceId === undefined || state.deviceId === input.deviceId)
    );
  }

  /**
   * La revocación de todo el usuario sale con su tenant de origen en el sobre: los consumidores que exigen un tenant
   * ubicado (notifications cierra sus conexiones de tiempo real) la rechazarían sin él.
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

  /** Conserva la suspensión vigente: la escribe `users`, y esta época solo corre el corte. */
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
