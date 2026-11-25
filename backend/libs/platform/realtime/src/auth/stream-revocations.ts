import type { StreamPrincipal } from './stream-principal.js';

/**
 * Revocations that an open connection does not receive through its stream. Those of a session or a user arrive
 * as a frame; that of a tenant names no users, so each connection checks it on its heartbeat.
 */
export abstract class StreamRevocations {
  /** `true` if the token's tenant was revoked or suspended after `openedAt`. */
  abstract revokedSince(
    principal: StreamPrincipal,
    openedAt: Date,
  ): Promise<boolean>;
}
