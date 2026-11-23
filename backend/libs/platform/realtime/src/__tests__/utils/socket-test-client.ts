import { io, type Socket } from 'socket.io-client';
import { SocketSink } from '../../socket-io/socket-sink.js';
import type { ReceivedFrame } from './received-frame.js';

interface EmittedFrame {
  readonly id: string;
  readonly data: unknown;
}

/** Cliente Socket.IO de prueba que guarda cada trama y reconecta con el id de la última recibida. */
export class SocketTestClient {
  readonly frames: ReceivedFrame[] = [];
  disconnected = false;
  connectError: string | undefined;
  private socket: Socket | undefined;

  async open(
    url: string,
    token: string,
    lastEventId?: string,
    origin?: string,
  ): Promise<void> {
    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      ...(origin === undefined ? {} : { extraHeaders: { Origin: origin } }),
      auth: { token, ...(lastEventId === undefined ? {} : { lastEventId }) },
    });
    this.socket.onAny((type: string, frame?: EmittedFrame) => {
      if (frame !== undefined) {
        this.frames.push({ id: frame.id, type, data: frame.data });
      }
    });
    this.socket.on('disconnect', () => {
      this.disconnected = true;
    });
    await new Promise<void>((resolve) => {
      this.socket?.on(SocketSink.READY_EVENT, () => resolve());
      this.socket?.on('connect_error', (error) => {
        this.connectError = error.message;
        resolve();
      });
    });
  }

  lastEventId(): string | undefined {
    return this.frames.at(-1)?.id;
  }

  close(): void {
    this.socket?.disconnect();
  }
}
