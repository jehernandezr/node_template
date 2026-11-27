import { SystemClock } from '@platform/kernel';
import { SilentLogger } from '@platform/messaging/test-utils';
import { InMemoryPresenceTracker } from '../presence/in-memory-presence-tracker.js';
import { RealtimePublisher } from '../realtime-publisher.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import {
  UnavailablePresenceTracker,
  UnavailableRealtimeStream,
} from './utils/index.js';

describe('RealtimePublisher', () => {
  it('appends the frame to the user stream', async () => {
    const stream = new InMemoryRealtimeStream();
    const publisher = new RealtimePublisher(
      stream,
      new InMemoryPresenceTracker(new SystemClock()),
      new SilentLogger(),
    );

    await expect(
      publisher.publish('user-1', { type: 'notification', data: {} }),
    ).resolves.toEqual(expect.any(String));
  });

  it('drops the frame without failing the caller when the stream store is down', async () => {
    const publisher = new RealtimePublisher(
      new UnavailableRealtimeStream(),
      new InMemoryPresenceTracker(new SystemClock()),
      new SilentLogger(),
    );

    await expect(
      publisher.publish('user-1', { type: 'notification', data: {} }),
    ).resolves.toBeUndefined();
  });

  it('counts the user as offline when presence cannot be read', async () => {
    const publisher = new RealtimePublisher(
      new InMemoryRealtimeStream(),
      new UnavailablePresenceTracker(),
      new SilentLogger(),
    );

    await expect(publisher.isOnline('user-1')).resolves.toBe(false);
  });
});
