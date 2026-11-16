import type {
  ValkeyConnectionOpener,
  ValkeySubscriberClient,
  ValkeySubscriberConnection,
} from './valkey-subscriber-connection.js';

/**
 * Entrega la conexión dedicada del suscriptor de pub/sub y la abre la primera
 * vez que se pide, así un servicio que no se suscribe no gasta una conexión.
 */
export class ValkeySubscriberSource {
  private opened: Promise<ValkeySubscriberClient> | undefined;

  constructor(private readonly opener: ValkeyConnectionOpener) {}

  /** La misma conexión en cada llamada. */
  connection(): Promise<ValkeySubscriberConnection> {
    if (this.opened === undefined) {
      const opening = this.opener.create();
      this.opened = opening;
      // Si abrir falla, el siguiente intento vuelve a abrir en lugar de repetir el error.
      opening.catch(() => {
        if (this.opened === opening) {
          this.opened = undefined;
        }
      });
    }
    return this.opened;
  }

  /** Cierra la conexión con `quit` si se abrió; si el servidor no responde, la corta. */
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
