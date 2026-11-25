import { Injectable } from '@nestjs/common';
import {
  PermissionsChangedEvent,
  RevocationScope,
  SessionRevokedEvent,
  TokensRevokedEvent,
  type PermissionsChangedPayload,
  type SessionRevokedPayload,
  type TokensRevokedPayload,
} from '@contracts/identity';
import { Subscribe } from '@platform/messaging/nest';
import { AccessFacade } from '../modules/access/index.js';
import { SessionsFacade } from '../modules/sessions/index.js';

/**
 * Replays the revocations and permission versions of identity into the shared auth state (queue
 * `identity-auth-state`). The use cases already write them right after the commit; this consumer is the
 * durable path when that write is lost to a Valkey outage or a crash. Every replay is idempotent and never
 * moves a cut-off or a version back, so the order of the events does not matter.
 */
@Injectable()
export class AuthStateConsumer {
  constructor(
    private readonly sessions: SessionsFacade,
    private readonly access: AccessFacade,
  ) {}

  /**
   * Marks the revoked session again in the shared state.
   * @param data Published session revocation.
   */
  @Subscribe(SessionRevokedEvent)
  async onSessionRevoked(data: SessionRevokedPayload): Promise<void> {
    await this.sessions.replaySessionRevocation(data);
  }

  /**
   * Moves the epoch of a user whose every session was revoked. The other scopes have their own path.
   * @param data Published token revocation.
   */
  @Subscribe(TokensRevokedEvent)
  async onTokensRevoked(data: TokensRevokedPayload): Promise<void> {
    if (data.scope === RevocationScope.User) {
      await this.sessions.replayUserRevocation(data);
    }
  }

  /**
   * Copies a new permission version into the shared state.
   * @param data Published permission change.
   */
  @Subscribe(PermissionsChangedEvent)
  async onPermissionsChanged(data: PermissionsChangedPayload): Promise<void> {
    await this.access.replayPermissionVersion(data);
  }
}
