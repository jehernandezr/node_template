import type { RealtimeHost } from './realtime-host.js';

/** A realtime transport mounted on the process's HTTP server. */
export abstract class RealtimeTransport {
  /**
   * Attaches the transport to the HTTP server.
   * @param host Server and its upgrade hooks.
   */
  abstract attach(host: RealtimeHost): void;

  /** Closes the open connections; the HTTP server is closed by its owner. */
  abstract close(): Promise<void>;
}
