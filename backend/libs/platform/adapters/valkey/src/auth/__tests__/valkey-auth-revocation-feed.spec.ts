import {
  FakePubSubBroker,
  RecordingErrorListener,
  ValkeyExecutors,
} from '../../__tests__/utils/index.js';
import { ValkeyCommand } from '../../valkey-command.enum.js';
import { ValkeyErrorCode } from '../../valkey-error-code.enum.js';
import { ValkeySubscriberSource } from '../../valkey-subscriber-source.js';
import { ValkeyAuthRevocationFeed } from '../valkey-auth-revocation-feed.js';

const CHANNEL = 'auth:revocations';

const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setImmediate(resolve));

function feedOver(
  broker: FakePubSubBroker,
  errors: RecordingErrorListener,
): ValkeyAuthRevocationFeed {
  return new ValkeyAuthRevocationFeed(
    new ValkeySubscriberSource(broker.opener),
    errors.report,
  );
}

async function publish(
  broker: FakePubSubBroker,
  sessionId: string,
): Promise<void> {
  await ValkeyExecutors.over(broker.publisher).run(ValkeyCommand.Publish, [
    CHANNEL,
    sessionId,
  ]);
  await flush();
}

describe('ValkeyAuthRevocationFeed', () => {
  describe('delivery', () => {
    it('delivers the session ids published on the revocations channel', async () => {
      const broker = new FakePubSubBroker();
      const errors = new RecordingErrorListener();
      const feed = feedOver(broker, errors);
      const received: string[] = [];
      const stop = await feed.subscribe((sessionId) => {
        received.push(sessionId);
      });

      await publish(broker, 's1');

      expect(received).toEqual(['s1']);
      expect(errors.errors).toEqual([]);
      await stop();
    });

    it('delivers each revocation to every subscribed handler', async () => {
      const broker = new FakePubSubBroker();
      const feed = feedOver(broker, new RecordingErrorListener());
      const first: string[] = [];
      const second: string[] = [];
      const stopFirst = await feed.subscribe((sessionId) => {
        first.push(sessionId);
      });
      const stopSecond = await feed.subscribe((sessionId) => {
        second.push(sessionId);
      });

      await publish(broker, 's1');

      expect(first).toEqual(['s1']);
      expect(second).toEqual(['s1']);
      await stopFirst();
      await stopSecond();
    });

    it('opens a single subscriber connection for several handlers', async () => {
      const broker = new FakePubSubBroker();
      const feed = feedOver(broker, new RecordingErrorListener());

      const stopFirst = await feed.subscribe(() => undefined);
      const stopSecond = await feed.subscribe(() => undefined);

      expect(broker.opened).toBe(1);
      await stopFirst();
      await stopSecond();
    });

    it('unsubscribes from the channel with the last handler only', async () => {
      const broker = new FakePubSubBroker();
      const feed = feedOver(broker, new RecordingErrorListener());
      const stopFirst = await feed.subscribe(() => undefined);
      const stopSecond = await feed.subscribe(() => undefined);

      await stopFirst();
      expect(broker.subscribed.has(CHANNEL)).toBe(true);
      await stopSecond();

      expect(broker.subscribed.has(CHANNEL)).toBe(false);
    });
  });

  describe('malformed messages and handler failures', () => {
    it.each([[''], ['x'.repeat(129)]])(
      'reports the message %j as an unexpected reply and delivers nothing',
      async (message) => {
        const broker = new FakePubSubBroker();
        const errors = new RecordingErrorListener();
        const feed = feedOver(broker, errors);
        const received: string[] = [];
        const stop = await feed.subscribe((sessionId) => {
          received.push(sessionId);
        });

        broker.emit(CHANNEL, message);
        await flush();

        expect(received).toEqual([]);
        expect(errors.errors).toHaveLength(1);
        expect(errors.errors[0]).toMatchObject({
          code: ValkeyErrorCode.UnexpectedReply,
        });
        await stop();
      },
    );

    it('reports a failing handler and still delivers to the others', async () => {
      const broker = new FakePubSubBroker();
      const errors = new RecordingErrorListener();
      const feed = feedOver(broker, errors);
      const failure = new Error('handler broke');
      const received: string[] = [];
      const stopFailing = await feed.subscribe(() => {
        throw failure;
      });
      const stopHealthy = await feed.subscribe((sessionId) => {
        received.push(sessionId);
      });

      await publish(broker, 's1');

      expect(errors.errors).toEqual([failure]);
      expect(received).toEqual(['s1']);
      await stopFailing();
      await stopHealthy();
    });
  });

  describe('subscription failures', () => {
    it('rejects the subscription when the broker refuses it and works on the next try', async () => {
      const broker = new FakePubSubBroker();
      const feed = feedOver(broker, new RecordingErrorListener());
      const failure = new Error('subscribe refused');
      broker.subscribeFailure = failure;
      const received: string[] = [];

      await expect(feed.subscribe(() => undefined)).rejects.toBe(failure);

      const stop = await feed.subscribe((sessionId) => {
        received.push(sessionId);
      });
      await publish(broker, 's2');

      expect(received).toEqual(['s2']);
      await stop();
    });
  });
});
