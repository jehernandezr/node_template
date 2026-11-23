import { Eventually, SilentLogger } from '@platform/messaging/test-utils';
import { RealtimeSession } from '../session/realtime-session.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import { RealtimeFrames, type StoredFrame } from '../stream/realtime-frame.js';
import { RecordingSink } from './utils/index.js';

const principal = {
  userId: 'user-ana',
  tenantId: 'tenant-acme',
  homeTenantId: 'tenant-acme',
  sessionId: 'session-1',
  sessionExpiresAt: 4_102_444_800,
};

/** Stream que deja de responder las lecturas cuando la prueba lo corta, como Valkey caído un instante. */
class FlakyStream extends InMemoryRealtimeStream {
  down = false;

  override async readAfter(
    channel: string,
    afterId: string | undefined,
    limit: number,
  ): Promise<readonly StoredFrame[]> {
    if (this.down) {
      throw new Error('stream unreachable');
    }
    return super.readAfter(channel, afterId, limit);
  }
}

const sessionOver = (
  stream: InMemoryRealtimeStream,
  sink: RecordingSink,
  lastEventId?: string,
) =>
  new RealtimeSession(stream, principal, sink, lastEventId, new SilentLogger());

describe('RealtimeSession', () => {
  describe('when it opens', () => {
    it('delivers only the frames after the last one the client saw', async () => {
      const stream = new InMemoryRealtimeStream();
      const seen = await stream.append('user-ana', { type: 'a', data: 1 });
      await stream.append('user-ana', { type: 'b', data: 2 });
      const sink = new RecordingSink();

      await sessionOver(stream, sink, seen).open();

      expect(sink.types()).toEqual(['b']);
    });

    it('starts at the end of the stream when the client brings no id', async () => {
      const stream = new InMemoryRealtimeStream();
      await stream.append('user-ana', { type: 'old', data: 1 });
      const sink = new RecordingSink();
      await sessionOver(stream, sink).open();

      await stream.append('user-ana', { type: 'new', data: 2 });

      await Eventually.until(() => sink.sent.length > 0);
      expect(sink.types()).toEqual(['new']);
    });

    it('starts at the end of the stream when the client brings an id the stream never gave', async () => {
      const stream = new InMemoryRealtimeStream();
      await stream.append('user-ana', { type: 'old', data: 1 });
      const sink = new RecordingSink();
      await sessionOver(stream, sink, 'forged-id').open();

      await stream.append('user-ana', { type: 'new', data: 2 });

      await Eventually.until(() => sink.sent.length > 0);
      expect(sink.types()).toEqual(['new']);
    });
  });

  describe('when the stream fails after it opened', () => {
    const unhandled: unknown[] = [];
    const record = (reason: unknown): void => {
      unhandled.push(reason);
    };

    beforeEach(() => {
      process.on('unhandledRejection', record);
    });

    afterEach(() => {
      process.off('unhandledRejection', record);
    });

    it('closes the connection so the client resumes elsewhere, without an unhandled rejection', async () => {
      const stream = new FlakyStream();
      const sink = new RecordingSink();
      const session = sessionOver(stream, sink);
      await session.open();

      stream.down = true;
      await stream.append('user-ana', { type: 'lost', data: 1 });
      session.catchUp();

      await Eventually.until(() => sink.closed);
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
      expect(sink.sent).toEqual([]);
    });
  });

  describe('while it is open', () => {
    it('delivers new frames once and in order even when notices overlap', async () => {
      const stream = new InMemoryRealtimeStream();
      const sink = new RecordingSink();
      const session = sessionOver(stream, sink);
      await session.open();

      await Promise.all([
        stream.append('user-ana', { type: 'a', data: 1 }),
        stream.append('user-ana', { type: 'b', data: 2 }),
        stream.append('user-ana', { type: 'c', data: 3 }),
      ]);
      session.catchUp();

      await Eventually.until(() => sink.sent.length >= 3);
      expect(sink.types()).toEqual(['a', 'b', 'c']);
    });

    it('delivers the closing frame of its session and then closes', async () => {
      const stream = new InMemoryRealtimeStream();
      const sink = new RecordingSink();
      await sessionOver(stream, sink).open();

      await stream.append('user-ana', {
        type: 'session-closed',
        data: {},
        closesSession: 'session-1',
      });
      await stream.append('user-ana', { type: 'after', data: {} });

      await Eventually.until(() => sink.closed);
      expect(sink.types()).toEqual(['session-closed']);
    });

    it('closes when every session of the user is closed', async () => {
      const stream = new InMemoryRealtimeStream();
      const sink = new RecordingSink();
      await sessionOver(stream, sink).open();

      await stream.append('user-ana', {
        type: 'session-closed',
        data: {},
        closesSession: RealtimeFrames.ALL_SESSIONS,
      });

      await Eventually.until(() => sink.closed);
    });

    it('keeps going when another session of the same user is closed', async () => {
      const stream = new InMemoryRealtimeStream();
      const sink = new RecordingSink();
      await sessionOver(stream, sink).open();

      await stream.append('user-ana', {
        type: 'session-closed',
        data: {},
        closesSession: 'session-2',
      });
      await stream.append('user-ana', { type: 'after', data: {} });

      await Eventually.until(() => sink.sent.length === 2);
      expect(sink.closed).toBe(false);
    });
  });

  it('stops listening after it closes', async () => {
    const stream = new InMemoryRealtimeStream();
    const sink = new RecordingSink();
    const session = sessionOver(stream, sink);
    await session.open();

    await session.close();
    await stream.append('user-ana', { type: 'late', data: {} });

    expect(sink.sent).toEqual([]);
    expect(sink.closed).toBe(true);
  });
});
