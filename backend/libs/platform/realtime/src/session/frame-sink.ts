import type { StoredFrame } from '../stream/realtime-frame.js';

/** Where a connection's frames go out: the SSE response or the socket. */
export interface FrameSink {
  /** The connection already has its position in the stream: whatever is published from now on reaches it. */
  ready(): void;
  send(frame: StoredFrame): void;
  /** Keep-alive signal so a proxy does not cut the connection for inactivity; transports with their own ping do nothing. */
  keepAlive(): void;
  close(): void;
}
