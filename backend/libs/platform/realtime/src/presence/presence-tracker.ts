/**
 * Who has an open realtime connection. A connection announces itself with a lifetime and renews it while
 * it stays open; if the process goes down, the mark expires on its own.
 */
export abstract class PresenceTracker {
  abstract connected(
    channel: string,
    connectionId: string,
    ttlMs: number,
  ): Promise<void>;

  abstract disconnected(channel: string, connectionId: string): Promise<void>;

  abstract isOnline(channel: string): Promise<boolean>;
}
