import { createServer, type AddressInfo, type Server } from 'node:net';

/**
 * Puertos libres pedidos al sistema antes de arrancar los servicios. Cada servicio necesita la URL de los demás
 * en su configuración, así que el puerto se conoce antes de escuchar en él.
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
