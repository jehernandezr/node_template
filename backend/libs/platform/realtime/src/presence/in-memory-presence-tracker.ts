import type { Clock } from '@platform/kernel';
import { PresenceTracker } from './presence-tracker.js';

/** In-process presence, for a single instance without Valkey. */
export class InMemoryPresenceTracker extends PresenceTracker {
  private readonly expiries = new Map<string, Map<string, number>>();

  constructor(private readonly clock: Clock) {
    super();
  }

  async connected(
    channel: string,
    connectionId: string,
    ttlMs: number,
  ): Promise<void> {
    const connections = this.expiries.get(channel) ?? new Map();
    connections.set(connectionId, this.clock.now().getTime() + ttlMs);
    this.expiries.set(channel, connections);
  }

  async disconnected(channel: string, connectionId: string): Promise<void> {
    this.expiries.get(channel)?.delete(connectionId);
  }

  async isOnline(channel: string): Promise<boolean> {
    const now = this.clock.now().getTime();
    return [...(this.expiries.get(channel)?.values() ?? [])].some(
      (expiresAt) => expiresAt > now,
    );
  }
}
