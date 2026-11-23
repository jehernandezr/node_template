import { Eventually } from '@platform/messaging/test-utils';
import type { RealtimeStream } from '../../stream/realtime-stream.js';

/** Lo que cambia entre adaptadores en el contrato de `RealtimeStream`. */
export interface RealtimeStreamContractOptions {
  /** Un id con la forma de los del adaptador pero posterior a cualquiera que pueda dar en la prueba. */
  readonly futureId: string;
}

/** Lo que todo `RealtimeStream` cumple. Cada prueba usa un canal propio, así la fábrica puede compartir estado. */
export function runRealtimeStreamContract(
  name: string,
  factory: () => RealtimeStream,
  options: RealtimeStreamContractOptions,
): void {
  describe(`${name} (RealtimeStream contract)`, () => {
    let channelCount = 0;
    const channel = (): string => `user-${name}-${(channelCount += 1)}`;

    it('returns every frame in append order with the ids it handed out', async () => {
      const stream = factory();
      const user = channel();
      const first = await stream.append(user, { type: 'a', data: { n: 1 } });
      const second = await stream.append(user, { type: 'b', data: { n: 2 } });

      const frames = await stream.readAfter(user, undefined, 10);

      expect(frames).toEqual([
        { id: first, type: 'a', data: { n: 1 } },
        { id: second, type: 'b', data: { n: 2 } },
      ]);
    });

    it('resumes strictly after the given id and honours the limit', async () => {
      const stream = factory();
      const user = channel();
      const first = await stream.append(user, { type: 'a', data: 1 });
      await stream.append(user, { type: 'b', data: 2 });
      await stream.append(user, { type: 'c', data: 3 });

      const frames = await stream.readAfter(user, first, 1);

      expect(frames.map((frame) => frame.type)).toEqual(['b']);
    });

    it('keeps the session that a frame closes', async () => {
      const stream = factory();
      const user = channel();
      await stream.append(user, {
        type: 'bye',
        data: {},
        closesSession: 's-1',
      });

      const [frame] = await stream.readAfter(user, undefined, 1);

      expect(frame?.closesSession).toBe('s-1');
    });

    it('resumes from the id the client brings when it is one of its own', async () => {
      const stream = factory();
      const user = channel();
      const seen = await stream.append(user, { type: 'a', data: 1 });
      await stream.append(user, { type: 'b', data: 2 });

      await expect(stream.resumePoint(user, seen)).resolves.toBe(seen);
    });

    it('starts at the end when the client brings no id, or none for an empty channel', async () => {
      const stream = factory();
      const user = channel();
      await expect(
        stream.resumePoint(user, undefined),
      ).resolves.toBeUndefined();
      await stream.append(user, { type: 'a', data: 1 });
      const last = await stream.append(user, { type: 'b', data: 2 });

      await expect(stream.resumePoint(user, undefined)).resolves.toBe(last);
    });

    it('starts at the end, without replaying what it keeps, when the client brings a malformed id', async () => {
      const stream = factory();
      const user = channel();
      await stream.append(user, { type: 'a', data: 1 });
      const last = await stream.append(user, { type: 'b', data: 2 });

      const start = await stream.resumePoint(user, 'not-an-id');

      expect(start).toBe(last);
      await expect(stream.readAfter(user, start, 10)).resolves.toEqual([]);
    });

    it('treats a well formed id from the future as the end and delivers what arrives next', async () => {
      const stream = factory();
      const user = channel();
      await stream.append(user, { type: 'a', data: 1 });
      const last = await stream.append(user, { type: 'b', data: 2 });

      const start = await stream.resumePoint(user, options.futureId);
      await stream.append(user, { type: 'c', data: 3 });

      expect(start).toBe(last);
      await expect(
        stream
          .readAfter(user, start, 10)
          .then((frames) => frames.map((frame) => frame.type)),
      ).resolves.toEqual(['c']);
    });

    it('reads nothing after an id that is not one of its own', async () => {
      const stream = factory();
      const user = channel();
      await stream.append(user, { type: 'a', data: 1 });

      await expect(stream.readAfter(user, 'not-an-id', 10)).resolves.toEqual(
        [],
      );
    });

    it('does not mix channels', async () => {
      const stream = factory();
      const [mine, theirs] = [channel(), channel()];
      await stream.append(theirs, { type: 'other', data: null });

      await expect(stream.readAfter(mine, undefined, 10)).resolves.toEqual([]);
    });

    it('notifies the subscribers of a channel until they unsubscribe', async () => {
      const stream = factory();
      const user = channel();
      let notices = 0;
      const unsubscribe = await stream.subscribe(user, () => {
        notices += 1;
      });

      await stream.append(user, { type: 'a', data: 1 });
      await Eventually.until(() => notices === 1, 5000);
      await unsubscribe();
      await stream.append(user, { type: 'b', data: 2 });

      await expect(stream.readAfter(user, undefined, 10)).resolves.toHaveLength(
        2,
      );
      expect(notices).toBe(1);
    });
  });
}
