import type { Socket } from 'socket.io';
import type { FrameSink } from '../session/frame-sink.js';
import type { StoredFrame } from '../stream/realtime-frame.js';

/**
 * Emits each frame as an event with its id, which the client sends back in `auth.lastEventId` when reconnecting. The
 * `ready` event tells the client that nothing published from now on is lost.
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

  /** Socket.IO already has its ping. */
  keepAlive(): void {
    return;
  }

  close(): void {
    this.socket.disconnect(true);
  }
}
