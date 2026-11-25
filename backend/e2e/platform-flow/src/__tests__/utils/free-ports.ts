import { createServer, type AddressInfo, type Server } from 'node:net';

/**
 * Free ports requested from the system before starting the services. Each service needs the URL of the others
 * in its configuration, so the port is known before listening on it.
 */
export class FreePorts {
  static async reserve(count: number): Promise<readonly number[]> {
    const servers = await Promise.all(
      Array.from({ length: count }, () => FreePorts.listen()),
    );
    const ports = servers.map(
      (server) => (server.address() as AddressInfo).port,
    );
    await Promise.all(servers.map((server) => FreePorts.close(server)));
    return ports;
  }

  private static listen(): Promise<Server> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve(server));
    });
  }

  private static close(server: Server): Promise<void> {
    return new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
