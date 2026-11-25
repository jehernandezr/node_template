import type { StoredFrame } from '../stream/realtime-frame.js';

/** `text/event-stream` format: the id allows resuming with `Last-Event-ID`. Pure utility. */
export class SseFrameEncoder {
  /** Pause the browser waits before reconnecting. */
  static readonly RETRY_MS = 3000;

  static frame(frame: StoredFrame): string {
    return `id: ${frame.id}\nevent: ${frame.type}\ndata: ${JSON.stringify(frame.data)}\n\n`;
  }

  static preamble(): string {
    return `retry: ${SseFrameEncoder.RETRY_MS}\n\n`;
  }

  /** Comment that the client ignores and that keeps traffic on the connection. */
  static keepAlive(): string {
    return ': keep-alive\n\n';
  }
}
