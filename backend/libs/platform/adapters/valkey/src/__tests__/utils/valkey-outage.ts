import {
  createConnection,
  createServer,
  type Server,
  type Socket,
} from 'node:net';
import type { AddressInfo } from 'node:net';

/** Where the real Valkey listens; read when a connection opens, so it may start after the outage proxy. */
export interface ValkeyOutageTarget {
  readonly host: string;
  readonly port: number;
}

/**
 * A TCP proxy in front of a real Valkey that a test can take down and bring back. The service under test connects to
 * the proxy; `begin` cuts every open connection and refuses new ones, as a Valkey outage does, without touching the
 * Valkey other suites share, and `end` lets connections through again.
 */
export class ValkeyOutage {
  private static readonly HOST = '127.0.0.1';
  private readonly sockets = new Set<Socket>();
  private server: Server | undefined;
  private down = false;

  constructor(private readonly target: () => ValkeyOutageTarget) {}

  /** Starts listening on a free port of the loopback interface. */
  async start(): Promise<void> {
    const server = createServer((client) => this.accept(client));
    await new Promise<void>((resolve) =>
      server.listen(0, ValkeyOutage.HOST, resolve),
    );
    this.server = server;
  }

  /** Cuts every connection and refuses new ones until `end`. */
  begin(): void {
    this.down = true;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
  }

  /** Lets connections through again. */
  end(): void {
    this.down = false;
  }

  /** Closes every connection and stops listening. */
  async stop(): Promise<void> {
    this.begin();
    const server = this.server;
    this.server = undefined;
    await new Promise<void>((resolve) =>
      server === undefined ? resolve() : server.close(() => resolve()),
    );
  }

  /**
   * The variables that point a service at the proxy instead of Valkey.
   * @returns `VALKEY_HOST` and `VALKEY_PORT` of the proxy.
   */
  environment(): Record<string, string> {
    const address = this.server?.address() as AddressInfo | undefined;
    if (address === undefined) {
      throw new Error('the outage proxy is not started');
    }
    return {
      VALKEY_HOST: ValkeyOutage.HOST,
      VALKEY_PORT: String(address.port),
    };
  }

  private accept(client: Socket): void {
    if (this.down) {
      client.destroy();
      return;
    }
    const { host, port } = this.target();
    const upstream = createConnection({ host, port });
    for (const [from, to] of [
      [client, upstream],
      [upstream, client],
    ] as const) {
      this.sockets.add(from);
      from.pipe(to);
      from.on('error', () => to.destroy());
      from.on('close', () => {
        this.sockets.delete(from);
        to.destroy();
      });
    }
  }
}
