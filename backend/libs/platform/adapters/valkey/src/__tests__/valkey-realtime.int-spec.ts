import {
  ContainerRuntime,
  FixedClock,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { SystemClock } from '@platform/kernel';
import { SilentLogger } from '@platform/messaging/test-utils';
import {
  AuthStateStreamRevocations,
  BearerStreamAuthenticator,
  RealtimeConnections,
  RealtimePublisher,
  SocketIoTransport,
  SseTransport,
  type RealtimeTransport,
} from '@platform/realtime';
import {
  RealtimeClients,
  RealtimeTestAuth,
  runPresenceTrackerContract,
  runRealtimeStreamContract,
  runTransportReconnectionContract,
  TestRealtimeHost,
  type MountedTransports,
} from '@platform/realtime/test-utils';
import { ValkeyPresenceTracker } from '../realtime/valkey-presence-tracker.js';
import { ValkeyRealtimeStream } from '../realtime/valkey-realtime-stream.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import { ValkeyExecutors, ValkeyTestServer } from './utils/index.js';

const PREFIX = 'notifications';
const SSE_PATH = '/v1/notifications/stream';
const NAMESPACE = '/notifications';
const HEARTBEAT_MS = 60_000;

/** Un proceso que atiende conexiones: su servidor, su conexión a Valkey y sus transportes. */
class RealtimeInstance {
  readonly host = new TestRealtimeHost();
  private readonly keyspace = new ValkeyKeyspace(PREFIX);
  private subscribers: ValkeySubscriberSource | undefined;
  private transports: RealtimeTransport[] = [];
  stream!: ValkeyRealtimeStream;
  presence!: ValkeyPresenceTracker;

  constructor(private readonly server: ValkeyTestServer) {}

  async start(auth: RealtimeTestAuth): Promise<void> {
    const executor = ValkeyExecutors.over(this.server.connect());
    this.subscribers = new ValkeySubscriberSource({
      create: async () => {
        const client = this.server.connect();
        await client.connect();
        return client;
      },
    });
    this.stream = new ValkeyRealtimeStream(
      executor,
      this.subscribers,
      this.keyspace,
      { retained: 100, ttlMs: 60_000 },
    );
    this.presence = new ValkeyPresenceTracker(
      executor,
      this.keyspace,
      new SystemClock(),
    );
    const connections = new RealtimeConnections(
      this.stream,
      this.presence,
      new AuthStateStreamRevocations(auth.state),
      new SequentialIdGenerator(),
      new SystemClock(),
      new SilentLogger(),
      HEARTBEAT_MS,
    );
    const authenticator = new BearerStreamAuthenticator(auth.verifier);
    this.transports = [
      new SseTransport(connections, authenticator, SSE_PATH),
      new SocketIoTransport(connections, authenticator, {
        namespace: NAMESPACE,
        allowedOrigins: [],
      }),
    ];
    this.transports.forEach((transport) => transport.attach(this.host));
    await this.host.listen();
  }

  async stop(): Promise<void> {
    await Promise.all(this.transports.map((transport) => transport.close()));
    await this.host.close();
    await this.subscribers?.close();
  }
}

new ContainerRuntime(process.env).describeIfAvailable(
  'realtime over Valkey',
  () => {
    jest.setTimeout(120_000);
    const server = new ValkeyTestServer(PREFIX);

    beforeAll(async () => {
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    describe('ports', () => {
      const subscribers: ValkeySubscriberSource[] = [];

      afterAll(async () => {
        await Promise.all(subscribers.map((source) => source.close()));
      });

      runRealtimeStreamContract(
        'ValkeyRealtimeStream',
        () => {
          const source = new ValkeySubscriberSource({
            create: async () => {
              const client = server.connect();
              await client.connect();
              return client;
            },
          });
          subscribers.push(source);
          return new ValkeyRealtimeStream(
            ValkeyExecutors.over(server.connect()),
            source,
            new ValkeyKeyspace(PREFIX),
            { retained: 100, ttlMs: 60_000 },
          );
        },
        { futureId: '9999999999999-0' },
      );

      runPresenceTrackerContract('ValkeyPresenceTracker', () => {
        const clock = new FixedClock();
        return {
          tracker: new ValkeyPresenceTracker(
            ValkeyExecutors.over(server.connect()),
            new ValkeyKeyspace(PREFIX),
            clock,
          ),
          advance: (ms) => clock.advance(ms),
        };
      });
    });

    describe('two instances sharing the stream', () => {
      const first = new RealtimeInstance(server);
      const second = new RealtimeInstance(server);
      let mounted: MountedTransports;

      beforeAll(async () => {
        const auth = await RealtimeTestAuth.create();
        await first.start(auth);
        await second.start(auth);
        mounted = {
          auth,
          baseUrl: first.host.url(),
          resumeUrl: second.host.url(),
          publisher: new RealtimePublisher(first.stream, first.presence),
          presence: first.presence,
        };
      });

      afterAll(async () => {
        await first.stop();
        await second.stop();
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
    });
  },
);
