import type { ServerResponse } from 'node:http';
import type { FrameSink } from '../session/frame-sink.js';
import type { StoredFrame } from '../stream/realtime-frame.js';
import { SseFrameEncoder } from './sse-frame-encoder.js';

/** Writes the frames to the SSE response. The response starts once the connection is already listening to the stream. */
export class SseResponseSink implements FrameSink {
  private static readonly OK = 200;

  constructor(private readonly response: ServerResponse) {}

  ready(): void {
    this.response.writeHead(SseResponseSink.OK, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    this.response.write(SseFrameEncoder.preamble());
  }

  send(frame: StoredFrame): void {
    this.response.write(SseFrameEncoder.frame(frame));
  }

  keepAlive(): void {
    this.response.write(SseFrameEncoder.keepAlive());
  }

  close(): void {
    this.response.end();
  }
}
