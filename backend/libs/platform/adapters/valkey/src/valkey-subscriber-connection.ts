/** Listener of a subscriber connection: channel and message. */
export type ValkeyMessageListener = (channel: string, message: string) => void;

/**
 * What the change channel uses from a dedicated connection in subscriber mode.
 * An iovalkey client in that mode satisfies it.
 */
export interface ValkeySubscriberConnection {
  subscribe(...channels: string[]): Promise<unknown>;
  unsubscribe(...channels: string[]): Promise<unknown>;
  on(event: 'message', listener: ValkeyMessageListener): unknown;
  off(event: 'message', listener: ValkeyMessageListener): unknown;
}

/** Subscriber connection that can also be closed with `quit`. */
export interface ValkeySubscriberClient extends ValkeySubscriberConnection {
  quit(): Promise<unknown>;
  disconnect(): void;
}

/** Opens new connections. `ValkeyClientFactory` implements it. */
export interface ValkeyConnectionOpener {
  create(): Promise<ValkeySubscriberClient>;
}
