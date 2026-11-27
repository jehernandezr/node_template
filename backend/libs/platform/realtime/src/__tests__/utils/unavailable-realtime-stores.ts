import { SystemClock } from '@platform/kernel';
import { InMemoryPresenceTracker } from '../../presence/in-memory-presence-tracker.js';
import { InMemoryRealtimeStream } from '../../stream/in-memory-realtime-stream.js';

/** A stream whose store is down: every append fails. */
export class UnavailableRealtimeStream extends InMemoryRealtimeStream {
  override append(): Promise<string> {
    return Promise.reject(new Error('stream store down'));
  }
}

/** A presence tracker whose store is down: every read fails. */
export class UnavailablePresenceTracker extends InMemoryPresenceTracker {
  constructor() {
    super(new SystemClock());
  }

  override isOnline(): Promise<boolean> {
    return Promise.reject(new Error('presence store down'));
  }
}
