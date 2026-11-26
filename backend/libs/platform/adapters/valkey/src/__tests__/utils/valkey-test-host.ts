/** The Valkey a `ValkeyTestServer` runs on: the one the run shares or one of its own. */
export abstract class ValkeyTestHost {
  /**
   * Makes the server reachable.
   * @returns Resolves once it accepts connections.
   */
  abstract start(): Promise<void>;

  /**
   * Releases what `start` took.
   * @returns Resolves once it is released.
   */
  abstract stop(): Promise<void>;

  /**
   * Host name the clients connect to.
   * @returns The host of a started server.
   */
  abstract host(): string;

  /**
   * Port the clients connect to.
   * @returns The port of a started server.
   */
  abstract port(): number;
}
