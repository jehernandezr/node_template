import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryPresenceTracker } from '../presence/in-memory-presence-tracker.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import {
  runPresenceTrackerContract,
  runRealtimeStreamContract,
} from './utils/index.js';

runRealtimeStreamContract(
  'InMemoryRealtimeStream',
  () => new InMemoryRealtimeStream(),
  { futureId: '999999999' },
);

runPresenceTrackerContract('InMemoryPresenceTracker', () => {
  const clock = new FixedClock();
  return {
    tracker: new InMemoryPresenceTracker(clock),
    advance: (ms) => clock.advance(ms),
  };
});

describe('InMemoryRealtimeStream', () => {
  it('keeps only the most recent frames of a channel', async () => {
    const stream = new InMemoryRealtimeStream(2);
    await stream.append('user', { type: 'a', data: 1 });
    await stream.append('user', { type: 'b', data: 2 });
    await stream.append('user', { type: 'c', data: 3 });

    const frames = await stream.readAfter('user', undefined, 10);

    expect(frames.map((frame) => frame.type)).toEqual(['b', 'c']);
  });
});
