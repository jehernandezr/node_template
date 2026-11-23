import type { Socket } from 'socket.io';
import type { FrameSink } from '../session/frame-sink.js';
import type { StoredFrame } from '../stream/realtime-frame.js';

/**
 * Emite cada trama como evento con su id, que el cliente devuelve en `auth.lastEventId` al reconectar. El
 * evento `ready` le dice al cliente que ya no se pierde nada de lo que se publique.
 */
export class SocketSink implements FrameSink {
  static readonly READY_EVENT = 'ready';

  constructor(private readonly socket: Socket) {}

  ready(): void {
    this.socket.emit(SocketSink.READY_EVENT);
  }

  send(frame: StoredFrame): void {
    this.socket.emit(frame.type, { id: frame.id, data: frame.data });
  }

  /** Socket.IO ya tiene su ping. */
  keepAlive(): void {
    return;
  }

  close(): void {
    this.socket.disconnect(true);
  }
}
