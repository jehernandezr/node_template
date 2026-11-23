import { BearerStreamAuthenticator } from '../auth/bearer-stream-authenticator.js';
import { CookieStreamAuthenticator } from '../auth/cookie-stream-authenticator.js';
import { RealtimeAuthKind } from '../realtime-auth-kind.enum.js';
import { RealtimeComponents } from '../realtime-components.js';
import { realtimeConfigSchema } from '../realtime.config.js';
import { RealtimeTransportKind } from '../realtime-transport-kind.enum.js';
import { SocketIoTransport } from '../socket-io/socket-io-transport.js';
import { SseTransport } from '../sse/sse-transport.js';
import type { RealtimeConnections } from '../session/realtime-connections.js';
import { RealtimeTestAuth } from './utils/index.js';

const endpoints = {
  ssePath: '/v1/notifications/stream',
  socketNamespace: '/notifications',
  allowedOrigins: [],
};
const connections = {} as RealtimeConnections;

describe('RealtimeComponents', () => {
  it('mounts both transports by default', async () => {
    const settings = realtimeConfigSchema.parse({});
    const components = new RealtimeComponents(settings);
    const auth = await RealtimeTestAuth.create();

    const transports = components.transports(
      connections,
      components.authenticator(auth.verifier),
      endpoints,
    );

    expect(transports.map((transport) => transport.constructor)).toEqual([
      SseTransport,
      SocketIoTransport,
    ]);
  });

  it('mounts only the transports listed in REALTIME_TRANSPORTS', async () => {
    const settings = realtimeConfigSchema.parse({
      REALTIME_TRANSPORTS: RealtimeTransportKind.SocketIo,
    });
    const auth = await RealtimeTestAuth.create();
    const components = new RealtimeComponents(settings);

    const transports = components.transports(
      connections,
      components.authenticator(auth.verifier),
      endpoints,
    );

    expect(transports).toEqual([expect.any(SocketIoTransport)]);
  });

  it.each([
    [RealtimeAuthKind.Bearer, BearerStreamAuthenticator],
    [RealtimeAuthKind.Cookie, CookieStreamAuthenticator],
  ])('builds the %s authenticator', async (kind, type) => {
    const auth = await RealtimeTestAuth.create();
    const components = new RealtimeComponents(
      realtimeConfigSchema.parse({ REALTIME_AUTH: kind }),
    );

    expect(components.authenticator(auth.verifier)).toBeInstanceOf(type);
  });

  it('refuses an unknown transport in the configuration', () => {
    expect(
      realtimeConfigSchema.safeParse({ REALTIME_TRANSPORTS: 'sse,polling' })
        .success,
    ).toBe(false);
  });
});
