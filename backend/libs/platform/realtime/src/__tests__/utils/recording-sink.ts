import type { FrameSink } from '../../session/frame-sink.js';
import type { StoredFrame } from '../../stream/realtime-frame.js';

/** Sink that stores what is delivered, to test the session without a transport. */
export class RecordingSink implements FrameSink {
  readonly sent: StoredFrame[] = [];
  keepAlives = 0;
  closed = false;
  isReady = false;

  ready(): void {
    this.isReady = true;
  }

  send(frame: StoredFrame): void {
    this.sent.push(frame);
  }

  keepAlive(): void {
    this.keepAlives += 1;
  }

  close(): void {
    this.closed = true;
  }

  types(): string[] {
    return this.sent.map((frame) => frame.type);
  }
}
