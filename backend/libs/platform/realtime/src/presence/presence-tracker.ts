/**
 * Quién tiene una conexión de tiempo real abierta. Una conexión se anuncia con una vida y la renueva mientras
 * sigue abierta; si el proceso cae, la marca vence sola.
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
