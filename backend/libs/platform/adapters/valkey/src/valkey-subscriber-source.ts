import type {
  ValkeyConnectionOpener,
  ValkeySubscriberClient,
  ValkeySubscriberConnection,
} from './valkey-subscriber-connection.js';

/**
 * Provides the dedicated pub/sub subscriber connection and opens it the first
 * time it is requested, so a service that does not subscribe does not spend a connection.
 */
export class ValkeySubscriberSource {
  private opened: Promise<ValkeySubscriberClient> | undefined;

  constructor(private readonly opener: ValkeyConnectionOpener) {}

  /**
   * Returns the same connection on each call.
   * If opening fails, the next attempt opens again instead of repeating the error.
   * @returns The subscriber connection.
   */
  connection(): Promise<ValkeySubscriberConnection> {
    if (this.opened === undefined) {
      const opening = this.opener.create();
      this.opened = opening;
      opening.catch(() => {
        if (this.opened === opening) {
          this.opened = undefined;
        }
      });
    }
    return this.opened;
  }

  /** Closes the connection with `quit` if it was opened; if the server does not respond, cuts it. */
  async close(): Promise<void> {
    const opened = this.opened;
    this.opened = undefined;
    if (opened === undefined) {
      return;
    }
    let client: ValkeySubscriberClient;
    try {
      client = await opened;
    } catch {
      return;
    }
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}
