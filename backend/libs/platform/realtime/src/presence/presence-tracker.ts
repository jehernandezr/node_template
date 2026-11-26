/**
 * Who has an open realtime connection. A connection announces itself with a lifetime and renews it while
 * it stays open; if the process goes down, the mark expires on its own.
 */
export abstract class PresenceTracker {
  /**
   * Records an open connection of a channel; it expires unless renewed.
   * @param channel User channel.
   * @param connectionId Connection id.
   * @param ttlMs Lifetime of the record.
   */
  abstract connected(
    channel: string,
    connectionId: string,
    ttlMs: number,
  ): Promise<void>;

  /**
   * Removes a closed connection.
   * @param channel User channel.
   * @param connectionId Connection id.
   */
  abstract disconnected(channel: string, connectionId: string): Promise<void>;

  /**
   * Tells whether a channel has an open connection.
   * @param channel User channel.
   * @returns `true` when online.
   */
  abstract isOnline(channel: string): Promise<boolean>;
}
