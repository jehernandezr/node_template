import { SystemClock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SilentLogger } from '@platform/messaging/test-utils';
import { AuthStateStreamRevocations } from '../auth/auth-state-stream-revocations.js';
import { BearerStreamAuthenticator } from '../auth/bearer-stream-authenticator.js';
import { InMemoryPresenceTracker } from '../presence/in-memory-presence-tracker.js';
import { RealtimePublisher } from '../realtime-publisher.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SocketIoTransport } from '../socket-io/socket-io-transport.js';
import { SseTransport } from '../sse/sse-transport.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import {
  RealtimeClients,
  RealtimeTestAuth,
  runTransportReconnectionContract,
  SocketTestClient,
  TestRealtimeHost,
  type MountedTransports,
} from './utils/index.js';

const SSE_PATH = '/v1/notifications/stream';
const NAMESPACE = '/notifications';
const HEARTBEAT_MS = 60_000;
const WEB_ORIGIN = 'https://app.example.com';

describe('realtime transports in one process', () => {
  const host = new TestRealtimeHost();
  const stream = new InMemoryRealtimeStream();
  const presence = new InMemoryPresenceTracker(new SystemClock());
  let connections: RealtimeConnections;
  let mounted: MountedTransports;
  let transports: Array<SseTransport | SocketIoTransport>;

  beforeAll(async () => {
    const auth = await RealtimeTestAuth.create();
    connections = new RealtimeConnections(
      stream,
      presence,
      new AuthStateStreamRevocations(auth.state),
      new SequentialIdGenerator(),
      new SystemClock(),
      new SilentLogger(),
      HEARTBEAT_MS,
    );
    const authenticator = new BearerStreamAuthenticator(auth.verifier);
    transports = [
      new SseTransport(connections, authenticator, SSE_PATH),
      new SocketIoTransport(connections, authenticator, {
        namespace: NAMESPACE,
        allowedOrigins: [WEB_ORIGIN],
      }),
    ];
    transports.forEach((transport) => transport.attach(host));
    await host.listen();
    mounted = {
      auth,
      baseUrl: host.url(),
      resumeUrl: host.url(),
      publisher: new RealtimePublisher(stream, presence),
      presence,
    };
  });

  afterAll(async () => {
    await Promise.all(transports.map((transport) => transport.close()));
    await host.close();
  });

  runTransportReconnectionContract(
    'SseTransport',
    () => mounted,
    RealtimeClients.sse(SSE_PATH),
  );

  runTransportReconnectionContract(
    'SocketIoTransport',
    () => mounted,
    RealtimeClients.socketIo(NAMESPACE),
  );

  it('answers 401 with a problem body to an SSE request without a token', async () => {
    const response = await fetch(`${host.url()}${SSE_PATH}`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PLATFORM.AUTH.UNAUTHENTICATED',
    });
  });

  describe('a Socket.IO handshake from a browser', () => {
    const openFrom = async (origin: string) => {
      const client = new SocketTestClient();
      await client.open(
        `${host.url()}${NAMESPACE}`,
        mounted.auth.token(),
        undefined,
        origin,
      );
      client.close();
      return client;
    };

    it('is refused from an origin outside the allowed list', async () => {
      const client = await openFrom('https://evil.example.com');

      expect(client.connectError).toBeDefined();
    });

    it('is accepted from an allowed origin', async () => {
      const client = await openFrom(WEB_ORIGIN);

      expect(client.connectError).toBeUndefined();
    });
  });

  it('closes every open connection when the transports close', async () => {
    const client = await RealtimeClients.sse(SSE_PATH)(
      host.url(),
      mounted.auth.token(),
    );

    await connections.closeAll();

    expect(connections.size).toBe(0);
    client.close();
  });
});
