/** Oyente de una conexión suscriptora: canal y mensaje. */
export type ValkeyMessageListener = (channel: string, message: string) => void;

/**
 * Lo que el canal de cambios usa de una conexión dedicada en modo suscriptor.
 * Un cliente de iovalkey en ese modo la cumple.
 */
export interface ValkeySubscriberConnection {
  subscribe(...channels: string[]): Promise<unknown>;
  unsubscribe(...channels: string[]): Promise<unknown>;
  on(event: 'message', listener: ValkeyMessageListener): unknown;
  off(event: 'message', listener: ValkeyMessageListener): unknown;
}

/** Conexión suscriptora que además se puede cerrar con `quit`. */
export interface ValkeySubscriberClient extends ValkeySubscriberConnection {
  quit(): Promise<unknown>;
  disconnect(): void;
}

/** Abre conexiones nuevas. `ValkeyClientFactory` la cumple. */
export interface ValkeyConnectionOpener {
  create(): Promise<ValkeySubscriberClient>;
}
