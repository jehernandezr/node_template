import type { FrameSink } from '../../session/frame-sink.js';
import type { StoredFrame } from '../../stream/realtime-frame.js';

/** Sumidero que guarda lo entregado, para probar la sesión sin un transporte. */
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
