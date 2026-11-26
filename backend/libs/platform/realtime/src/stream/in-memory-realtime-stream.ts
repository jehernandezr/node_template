import type { RealtimeFrame, StoredFrame } from './realtime-frame.js';
import { RealtimeStream, type StreamUnsubscribe } from './realtime-stream.js';

/**
 * In-process stream, for a service with a single instance and without Valkey. Retains the last
 * `retained` frames of each channel.
 */
export class InMemoryRealtimeStream extends RealtimeStream {
  private static readonly ID = /^\d+$/;

  private readonly frames = new Map<string, StoredFrame[]>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private sequence = 0;

  constructor(private readonly retained = 1000) {
    super();
  }

  override async append(
    channel: string,
    frame: RealtimeFrame,
  ): Promise<string> {
    this.sequence += 1;
    const id = `${this.sequence}`;
    const frames = [...(this.frames.get(channel) ?? []), { ...frame, id }];
    this.frames.set(channel, frames.slice(-this.retained));
    this.listeners.get(channel)?.forEach((listener) => listener());
    return id;
  }

  override async readAfter(
    channel: string,
    afterId: string | undefined,
    limit: number,
  ): Promise<readonly StoredFrame[]> {
    if (afterId !== undefined && !InMemoryRealtimeStream.ID.test(afterId)) {
      return [];
    }
    const after = afterId === undefined ? 0 : Number(afterId);
    return (this.frames.get(channel) ?? [])
      .filter((frame) => Number(frame.id) > after)
      .slice(0, limit);
  }

  override async resumePoint(
    channel: string,
    lastEventId: string | undefined,
  ): Promise<string | undefined> {
    const last = this.frames.get(channel)?.at(-1)?.id;
    if (
      lastEventId !== undefined &&
      last !== undefined &&
      InMemoryRealtimeStream.ID.test(lastEventId) &&
      Number(lastEventId) <= Number(last)
    ) {
      return lastEventId;
    }
    return last;
  }

  override async subscribe(
    channel: string,
    onAppend: () => void,
  ): Promise<StreamUnsubscribe> {
    const listener = (): void => onAppend();
    const listeners = this.listeners.get(channel) ?? new Set();
    listeners.add(listener);
    this.listeners.set(channel, listeners);
    return async () => {
      listeners.delete(listener);
    };
  }
}
