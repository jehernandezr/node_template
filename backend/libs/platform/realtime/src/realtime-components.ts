import { AccessTokenVerifier } from '@platform/auth';
import { BearerStreamAuthenticator } from './auth/bearer-stream-authenticator.js';
import { CookieStreamAuthenticator } from './auth/cookie-stream-authenticator.js';
import type { StreamAuthenticator } from './auth/stream-authenticator.js';
import { RealtimeAuthKind } from './realtime-auth-kind.enum.js';
import type { RealtimeSettings } from './realtime.config.js';
import type { RealtimeTransport } from './realtime-transport.js';
import { RealtimeTransportKind } from './realtime-transport-kind.enum.js';
import type { RealtimeConnections } from './session/realtime-connections.js';
import { SocketIoTransport } from './socket-io/socket-io-transport.js';
import { SseTransport } from './sse/sse-transport.js';

/** Where each transport serves. */
export interface RealtimeEndpoints {
  readonly ssePath: string;
  readonly socketNamespace: string;
  readonly allowedOrigins: readonly string[];
}

/** Builds the `REALTIME_AUTH` authenticator and the `REALTIME_TRANSPORTS` transports. */
export class RealtimeComponents {
  constructor(private readonly settings: RealtimeSettings) {}

  /**
   * Builds the stream authenticator of the configured mode.
   * @param verifier Access token verifier.
   * @returns The authenticator.
   */
  authenticator(verifier: AccessTokenVerifier): StreamAuthenticator {
    switch (this.settings.REALTIME_AUTH) {
      case RealtimeAuthKind.Bearer:
        return new BearerStreamAuthenticator(verifier);
      case RealtimeAuthKind.Cookie:
        return new CookieStreamAuthenticator(
          verifier,
          this.settings.REALTIME_AUTH_COOKIE,
        );
    }
  }

  /**
   * Builds the configured transports, SSE and Socket.IO.
   * @param connections Open connections.
   * @param authenticator Stream authenticator.
   * @param endpoints Paths of each transport.
   * @returns The transports.
   */
  transports(
    connections: RealtimeConnections,
    authenticator: StreamAuthenticator,
    endpoints: RealtimeEndpoints,
  ): RealtimeTransport[] {
    return this.settings.REALTIME_TRANSPORTS.map((kind) => {
      switch (kind) {
        case RealtimeTransportKind.Sse:
          return new SseTransport(
            connections,
            authenticator,
            endpoints.ssePath,
          );
        case RealtimeTransportKind.SocketIo:
          return new SocketIoTransport(connections, authenticator, {
            namespace: endpoints.socketNamespace,
            allowedOrigins: endpoints.allowedOrigins,
          });
      }
    });
  }
}
