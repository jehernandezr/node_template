import { request } from 'node:http';
import { InMemoryAuthState } from '@platform/auth/test-utils';
import { SystemClock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { Eventually, SilentLogger } from '@platform/messaging/test-utils';
import { io } from 'socket.io-client';
import { AuthStateStreamRevocations } from '../auth/auth-state-stream-revocations.js';
import { BearerStreamAuthenticator } from '../auth/bearer-stream-authenticator.js';
import { InMemoryPresenceTracker } from '../presence/in-memory-presence-tracker.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SocketIoTransport } from '../socket-io/socket-io-transport.js';
import { SseTransport } from '../sse/sse-transport.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import type { StreamUnsubscribe } from '../stream/realtime-stream.js';
import {
  RealtimeTestAuth,
  RecordingSink,
  TestRealtimeHost,
} from './utils/index.js';

const HEARTBEAT_MS = 60_000;
const SHORT_HEARTBEAT_MS = 20;
const WAIT_MS = 5000;
const SSE_PATH = '/stream';
const NAMESPACE = '/notifications';
const USER = RealtimeTestAuth.USER_ID;
const principal = {
  userId: USER,
  tenantId: RealtimeTestAuth.TENANT_ID,
  homeTenantId: RealtimeTestAuth.HOME_TENANT_ID,
  sessionId: RealtimeTestAuth.SESSION_ID,
  sessionExpiresAt: 4_102_444_800,
};

class UnreachableStream extends InMemoryRealtimeStream {
  override async subscribe(): Promise<StreamUnsubscribe> {
    throw new Error('stream unreachable');
  }
}

/** Retiene la puesta al día hasta que la prueba la suelta. */
class HeldStream extends InMemoryRealtimeStream {
  release: () => void = () => undefined;
  private readonly held = new Promise<void>((resolve) => {
    this.release = resolve;
  });

  override async resumePoint(
    channel: string,
    lastEventId: string | undefined,
  ): Promise<string | undefined> {
    await this.held;
    return super.resumePoint(channel, lastEventId);
  }
}

const connectionsOver = (
  stream: InMemoryRealtimeStream,
  presence: InMemoryPresenceTracker,
  state = new InMemoryAuthState(),
  heartbeatMs = HEARTBEAT_MS,
) =>
  new RealtimeConnections(
    stream,
    presence,
    new AuthStateStreamRevocations(state),
    new SequentialIdGenerator(),
    new SystemClock(),
    new SilentLogger(),
    heartbeatMs,
  );

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

describe('RealtimeConnections', () => {
  it('closes a connection whose stream cannot be opened and stops announcing its user', async () => {
    const presence = new InMemoryPresenceTracker(new SystemClock());
    const connections = connectionsOver(new UnreachableStream(), presence);
    const sink = new RecordingSink();

    await expect(
      connections.connect(principal, sink, undefined),
    ).rejects.toThrow('stream unreachable');

    expect(connections.size).toBe(0);
    expect(sink.closed).toBe(true);
    await expect(presence.isOnline(USER)).resolves.toBe(false);
  });

  describe('when identity revokes the tokens of a tenant', () => {
    it('closes the open connections of that tenant on the next heartbeat', async () => {
      const presence = new InMemoryPresenceTracker(new SystemClock());
      const state = new InMemoryAuthState();
      const connections = connectionsOver(
        new InMemoryRealtimeStream(),
        presence,
        state,
        SHORT_HEARTBEAT_MS,
      );
      const sink = new RecordingSink();
      await connections.connect(principal, sink, undefined);

      await state.setTenantEpoch(RealtimeTestAuth.TENANT_ID, {
        revokedBefore: nowInSeconds() + 1,
        suspended: false,
      });

      await Eventually.until(() => sink.closed, WAIT_MS);
      expect(connections.size).toBe(0);
      await expect(presence.isOnline(USER)).resolves.toBe(false);
    });

    it('keeps the connections of other tenants open', async () => {
      const state = new InMemoryAuthState();
      const connections = connectionsOver(
        new InMemoryRealtimeStream(),
        new InMemoryPresenceTracker(new SystemClock()),
        state,
        SHORT_HEARTBEAT_MS,
      );
      const sink = new RecordingSink();
      await connections.connect(principal, sink, undefined);

      await state.setTenantEpoch(RealtimeTestAuth.HOME_TENANT_ID, {
        revokedBefore: nowInSeconds() + 1,
        suspended: true,
      });
      await Eventually.until(() => sink.keepAlives >= 3, WAIT_MS);

      expect(sink.closed).toBe(false);
      expect(connections.size).toBe(1);
      await connections.closeAll();
    });
  });

  describe('over SSE', () => {
    const host = new TestRealtimeHost();
    const stream = new HeldStream();
    const presence = new InMemoryPresenceTracker(new SystemClock());
    const connections = connectionsOver(stream, presence);
    let clientLeft = false;

    beforeAll(async () => {
      const auth = await RealtimeTestAuth.create();
      new SseTransport(
        connections,
        new BearerStreamAuthenticator(auth.verifier),
        SSE_PATH,
      ).attach(host);
      await host.listen();
      host.server.once('connection', (socket) =>
        socket.once('close', () => {
          clientLeft = true;
        }),
      );
      const cut = request(`${host.url()}${SSE_PATH}`, {
        headers: { Authorization: `Bearer ${auth.token()}` },
      });
      cut.on('error', () => undefined);
      cut.end();
      await Eventually.until(() => connections.size === 1);
      cut.destroy();
    });

    afterAll(async () => {
      await connections.closeAll();
      await host.close();
    });

    it('closes the connection of a client that left before it caught up', async () => {
      await Eventually.until(() => clientLeft);
      stream.release();

      await Eventually.until(() => connections.size === 0);
      await expect(presence.isOnline(USER)).resolves.toBe(false);
    });
  });

  describe('over Socket.IO', () => {
    const host = new TestRealtimeHost();
    const stream = new HeldStream();
    const presence = new InMemoryPresenceTracker(new SystemClock());
    const connections = connectionsOver(stream, presence);
    let transport: SocketIoTransport;
    let clientLeft = false;

    beforeAll(async () => {
      const auth = await RealtimeTestAuth.create();
      transport = new SocketIoTransport(
        connections,
        new BearerStreamAuthenticator(auth.verifier),
        { namespace: NAMESPACE, allowedOrigins: [] },
      );
      transport.attach(host);
      await host.listen();
      host.server.once('connection', (socket) =>
        socket.once('close', () => {
          clientLeft = true;
        }),
      );
      const cut = io(`${host.url()}${NAMESPACE}`, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
        auth: { token: auth.token() },
      });
      await Eventually.until(() => connections.size === 1, WAIT_MS);
      cut.disconnect();
    });

    afterAll(async () => {
      await transport.close();
      await host.close();
    });

    it('closes the connection of a client that left before it caught up', async () => {
      await Eventually.until(() => clientLeft, WAIT_MS);
      stream.release();

      await Eventually.until(() => connections.size === 0, WAIT_MS);
      await expect(presence.isOnline(USER)).resolves.toBe(false);
    });
  });
});
