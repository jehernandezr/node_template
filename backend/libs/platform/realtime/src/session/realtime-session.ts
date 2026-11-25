import type { LoggerPort } from '@platform/observability';
import type { StreamPrincipal } from '../auth/stream-principal.js';
import { RealtimeFrames, type StoredFrame } from '../stream/realtime-frame.js';
import type {
  RealtimeStream,
  StreamUnsubscribe,
} from '../stream/realtime-stream.js';
import type { FrameSink } from './frame-sink.js';

/**
 * An open connection of a user. It first delivers what was missed since `lastEventId` and then each
 * new frame of the channel, always in order and without repeats: each read starts from the id of the last one delivered.
 * A frame with `closesSession` equal to the connection's session is delivered and closes the connection. If the stream
 * fails midway through delivery, the session is closed: the client reconnects with the id of the last frame received
 * and loses none.
 */
export class RealtimeSession {
  /** Frames per read: bounds the memory of a reconnection that comes back after a long time. */
  private static readonly BATCH = 100;

  private lastId: string | undefined;
  private unsubscribe: StreamUnsubscribe | undefined;
  private draining: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(
    private readonly stream: RealtimeStream,
    readonly principal: StreamPrincipal,
    private readonly sink: FrameSink,
    private readonly lastEventId: string | undefined,
    private readonly logger: LoggerPort,
  ) {}

  get channel(): string {
    return this.principal.userId;
  }

  /** Without `lastEventId`, or with one that is not from the stream, the connection starts at the end: the API already provides what came before. */
  async open(): Promise<void> {
    this.lastId = await this.stream.resumePoint(this.channel, this.lastEventId);
    this.unsubscribe = await this.stream.subscribe(this.channel, () => {
      this.catchUp();
    });
    this.sink.ready();
    this.catchUp();
    await this.draining;
  }

  /**
   * Reads what is pending; the calls are chained so the same frame is not delivered twice. The chain is never
   * left rejected: it is called by notices and heartbeats that nobody awaits.
   */
  catchUp(): void {
    this.draining = this.draining
      .then(() => this.drain())
      .catch((error: unknown) => this.fail(error));
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      await this.unsubscribe?.();
    } finally {
      this.sink.close();
    }
  }

  private async drain(): Promise<void> {
    while (!this.closed) {
      const frames = await this.stream.readAfter(
        this.channel,
        this.lastId,
        RealtimeSession.BATCH,
      );
      for (const frame of frames) {
        await this.deliver(frame);
        if (this.closed) {
          return;
        }
      }
      if (frames.length < RealtimeSession.BATCH) {
        return;
      }
    }
  }

  private async fail(error: unknown): Promise<void> {
    this.logger.warn('realtime delivery failed', {
      channel: this.channel,
      error: error instanceof Error ? error.message : String(error),
    });
    // Without Valkey the subscription is not canceled either; a notice that arrives later finds the session closed.
    await this.close().catch(() => undefined);
  }

  private async deliver(frame: StoredFrame): Promise<void> {
    this.sink.send(frame);
    this.lastId = frame.id;
    if (
      frame.closesSession === this.principal.sessionId ||
      frame.closesSession === RealtimeFrames.ALL_SESSIONS
    ) {
      await this.close();
    }
  }
}
