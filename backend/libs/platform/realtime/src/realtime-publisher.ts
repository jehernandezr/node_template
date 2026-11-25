import { PresenceTracker } from './presence/presence-tracker.js';
import type { RealtimeFrame } from './stream/realtime-frame.js';
import { RealtimeStream } from './stream/realtime-stream.js';

/**
 * Entry point of the service that decides what to send: writes to the user's stream and answers whether they have an
 * open connection. It does not know which transports serve or in which process they run.
 */
export class RealtimePublisher {
  constructor(
    private readonly stream: RealtimeStream,
    private readonly presence: PresenceTracker,
  ) {}

  publish(userId: string, frame: RealtimeFrame): Promise<string> {
    return this.stream.append(userId, frame);
  }

  isOnline(userId: string): Promise<boolean> {
    return this.presence.isOnline(userId);
  }
}
