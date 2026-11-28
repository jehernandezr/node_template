import { PlatformErrorCode } from '@contracts/platform';
import { SystemClock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SilentLogger } from '@platform/messaging/test-utils';
import { AuthStateStreamRevocations } from '../auth/auth-state-stream-revocations.js';
import { InMemoryPresenceTracker } from '../presence/in-memory-presence-tracker.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SocketIoTransport } from '../socket-io/socket-io-transport.js';
import { SseTransport } from '../sse/sse-transport.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import {
  RealtimeTestAuth,
  SocketTestClient,
  TestRealtimeHost,
  UnavailableStreamAuthenticator,
} from './utils/index.js';

const SSE_PATH = '/v1/notifications/stream';
const NAMESPACE = '/notifications';

describe('a stream whose revocation state cannot be checked', () => {
  const host = new TestRealtimeHost();
  let transports: Array<SseTransport | SocketIoTransport>;

  beforeAll(async () => {
    const auth = await RealtimeTestAuth.create();
    const connections = new RealtimeConnections(
      new InMemoryRealtimeStream(),
      new InMemoryPresenceTracker(new SystemClock()),
      new AuthStateStreamRevocations(auth.state),
      new SequentialIdGenerator(),
      new SystemClock(),
      new SilentLogger(),
      60_000,
    );
    const authenticator = new UnavailableStreamAuthenticator();
    transports = [
      new SseTransport(connections, authenticator, SSE_PATH),
      new SocketIoTransport(connections, authenticator, {
        namespace: NAMESPACE,
        allowedOrigins: [],
      }),
    ];
    transports.forEach((transport) => transport.attach(host));
    await host.listen();
  });

  afterAll(async () => {
    await Promise.all(transports.map((transport) => transport.close()));
    await host.close();
  });

  it('answers 503 to SSE with Retry-After, never 401, so the client keeps its session', async () => {
    const response = await fetch(`${host.url()}${SSE_PATH}`, {
      headers: { authorization: 'Bearer any' },
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('5');
    await expect(response.json()).resolves.toEqual({
      title: 'Service Unavailable',
      status: 503,
      code: PlatformErrorCode.DependencyUnavailable,
    });
  });

  it('refuses the Socket.IO handshake with the 503 status and code in the error data', async () => {
    const client = new SocketTestClient();

    await client.open(`${host.url()}${NAMESPACE}`, 'any');
    client.close();

    expect(client.connectError).toBe(PlatformErrorCode.DependencyUnavailable);
    expect(client.connectErrorData).toEqual({
      title: 'Service Unavailable',
      status: 503,
      code: PlatformErrorCode.DependencyUnavailable,
    });
  });
});
