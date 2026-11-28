import { createServer, type Server, type Socket } from 'node:net';
import type { DatabaseEndpoint } from '../../model/database-endpoint.js';

/**
 * TCP server on the loopback that accepts connections and never answers, like a database node behind a firewall
 * that drops the traffic: a client waits until its own connect timeout.
 */
export class SilentTcpServer {
  private readonly sockets = new Set<Socket>();
  private readonly server: Server = createServer((socket) => {
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
  });

  /**
   * Starts listening on a free port of the loopback.
   * @returns Where it listens.
   */
  async start(): Promise<DatabaseEndpoint> {
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, '127.0.0.1', resolve);
    });
    const address = this.server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('The silent server has no TCP address');
    }
    return { host: address.address, port: address.port };
  }

  /** Drops the open connections and stops listening. */
  async stop(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}
