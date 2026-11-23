import type {
  RealtimeClient,
  RealtimeClientOpener,
} from './realtime-client.js';
import { SocketTestClient } from './socket-test-client.js';
import { SseTestClient } from './sse-test-client.js';

/** Cómo se abre un cliente de cada transporte en las pruebas de reconexión. */
export class RealtimeClients {
  static sse(path: string): RealtimeClientOpener {
    return async (baseUrl, token, lastEventId) => {
      const client = new SseTestClient();
      await client.open(`${baseUrl}${path}`, {
        Authorization: `Bearer ${token}`,
        ...(lastEventId === undefined ? {} : { 'Last-Event-ID': lastEventId }),
      });
      return {
        get frames() {
          return client.frames;
        },
        get rejected() {
          return client.status === 401;
        },
        get closedByServer() {
          return client.ended;
        },
        lastEventId: () => client.lastEventId(),
        close: () => client.close(),
      } satisfies RealtimeClient;
    };
  }

  static socketIo(namespace: string): RealtimeClientOpener {
    return async (baseUrl, token, lastEventId) => {
      const client = new SocketTestClient();
      await client.open(`${baseUrl}${namespace}`, token, lastEventId);
      return {
        get frames() {
          return client.frames;
        },
        get rejected() {
          return client.connectError !== undefined;
        },
        get closedByServer() {
          return client.disconnected;
        },
        lastEventId: () => client.lastEventId(),
        close: () => client.close(),
      } satisfies RealtimeClient;
    };
  }
}
